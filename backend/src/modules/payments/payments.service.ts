import { createHash } from "node:crypto";
import {
  Op,
  UniqueConstraintError,
  type Transaction,
} from "sequelize";
import { env } from "../../config/env.js";
import {
  Order,
  Payment,
  PaymentWebhookEvent,
  Refund,
  User,
  sequelize,
} from "../../database/models/index.js";
import type { RefundStatus } from "../../database/models/refund.model.js";
import {
  createRefund,
  fetchRefund,
  initializeTransaction,
  isPaystackConfigured,
  verifyTransaction,
} from "../../integrations/payments/index.js";
import { verifyPaystackWebhookSignature } from "../../integrations/payments/paystack.signature.js";
import { fromMinorUnits, toMinorUnits } from "../../utils/money.js";
import {
  buildPaymentSummary,
  getOrderById,
  getOrderDataById,
} from "../orders/orders.service.js";
import type {
  InitializePaymentInput,
  RefundRequestInput,
} from "../orders/orders.validation.js";
import type {
  OrderPaymentSummary,
  RefundData,
} from "../orders/orders.types.js";
import {
  consumeReservationForOrder,
  restoreConsumedReservationForRefund,
} from "../orders/reservations.service.js";
import {
  publishOrderUpdated,
  recordOrderEvent,
} from "../orders/orders.events.js";

type PaymentRow = Payment & { order?: Order };

interface PaystackEventPayload {
  event: string;
  data: Record<string, unknown>;
}

function serviceError(
  message: string,
  code: string,
  status?: number,
): Error {
  return Object.assign(new Error(message), { code, status });
}

function readString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const raw = value[key];
  return typeof raw === "string" && raw.trim() !== "" ? raw : null;
}

function readNumber(
  value: Record<string, unknown>,
  key: string,
): number | null {
  const raw = value[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildPaymentReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = createHash("sha256")
    .update(`${Date.now()}-${Math.random()}-${process.pid}`)
    .digest("hex")
    .slice(0, 20)
    .toUpperCase();
  return `PAY-${date}-${suffix}`;
}

function buildRefundData(row: Refund): RefundData {
  const amountMinor = Number(row.amount);
  return {
    id: row.id,
    order_id: row.order_id,
    payment_id: row.payment_id,
    requested_by_user_id: row.requested_by_user_id ?? null,
    provider: row.provider ?? "paystack",
    provider_refund_id: row.provider_refund_id ?? null,
    transaction_reference: row.transaction_reference,
    amount_minor: amountMinor,
    amount: fromMinorUnits(amountMinor, row.currency),
    currency: row.currency,
    status: (row.status ?? "pending") as RefundStatus,
    customer_note: row.customer_note ?? null,
    merchant_note: row.merchant_note ?? null,
    processed_at: row.processed_at ?? null,
    failed_at: row.failed_at ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

async function findPaymentForUser(
  userId: string,
  reference: string,
): Promise<PaymentRow> {
  const payment = (await Payment.findOne({
    where: { reference },
    include: [{ model: Order, as: "order" }],
  })) as PaymentRow | null;
  if (!payment || !payment.order) {
    throw serviceError("Payment not found.", "NOT_FOUND");
  }
  if (
    payment.order.buyer_id !== userId &&
    payment.order.farmer_id !== userId
  ) {
    throw serviceError("Payment not found.", "NOT_FOUND");
  }
  return payment;
}

function assertPaystackCurrency(currency: string): void {
  if (
    env.PAYSTACK_CURRENCY &&
    currency.toUpperCase() !== env.PAYSTACK_CURRENCY.toUpperCase()
  ) {
    throw serviceError(
      `Paystack is configured for ${env.PAYSTACK_CURRENCY}, but this order is in ${currency}.`,
      "INVALID_OPERATION",
    );
  }
}

export async function initializePayment(
  userId: string,
  input: InitializePaymentInput,
): Promise<{
  payment: OrderPaymentSummary;
  authorization_url: string;
  access_code: string;
  order: Awaited<ReturnType<typeof getOrderById>>;
}> {
  if (!isPaystackConfigured()) {
    throw serviceError(
      "Paystack is not configured on this server.",
      "PAYSTACK_NOT_CONFIGURED",
      503,
    );
  }

  let paymentId: string | undefined;
  let existingSummary: OrderPaymentSummary | undefined;

  await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(input.order_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) {
      throw serviceError("Order not found.", "NOT_FOUND");
    }
    if (order.buyer_id !== userId) {
      throw serviceError(
        "Order not found.",
        order.farmer_id === userId ? "FORBIDDEN" : "NOT_FOUND",
      );
    }
    if (
      order.payment_status === "paid" ||
      !["pending_payment", "payment_failed"].includes(order.status ?? "")
    ) {
      throw serviceError(
        `Order in ${order.status} status cannot be paid.`,
        "INVALID_OPERATION",
      );
    }
    if (
      !order.reservation_expires_at ||
      new Date(order.reservation_expires_at).getTime() <= Date.now()
    ) {
      throw serviceError(
        "The inventory reservation has expired. The order can no longer be paid.",
        "INVALID_OPERATION",
      );
    }
    assertPaystackCurrency(order.currency);

    const pending = await Payment.findOne({
      where: { order_id: order.id, status: "pending" },
      order: [["created_at", "DESC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (pending?.authorization_url) {
      existingSummary = buildPaymentSummary(pending);
      return;
    }

    if (pending) {
      await pending.update(
        {
          status: "abandoned",
          last_error: "Superseded by a new payment attempt.",
        },
        { transaction },
      );
    }

    const buyer = await User.findByPk(order.buyer_id, { transaction });
    if (!buyer) {
      throw serviceError("Buyer account not found.", "NOT_FOUND");
    }

    const amountMinor = toMinorUnits(order.total_amount, order.currency);
    const reference = buildPaymentReference();
    const payment = await Payment.create(
      {
        order_id: order.id,
        provider: "paystack",
        reference,
        amount: amountMinor,
        currency: order.currency,
        status: "pending",
      },
      { transaction },
    );
    paymentId = payment.id;
  });

  if (existingSummary) {
    return {
      payment: existingSummary,
      authorization_url: existingSummary.authorization_url ?? "",
      access_code: existingSummary.access_code ?? "",
      order: await getOrderById(userId, input.order_id),
    };
  }

  if (!paymentId) {
    throw serviceError("Payment could not be initialized.", "INVALID_OPERATION");
  }

  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw serviceError("Payment not found.", "NOT_FOUND");
  }
  const order = await Order.findByPk(payment.order_id);
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  const buyer = await User.findByPk(order.buyer_id);
  if (!buyer) {
    throw serviceError("Buyer account not found.", "NOT_FOUND");
  }
  const buyerEmail =
    buyer.email ?? `${buyer.id}@payments.agroconnect.app`;

  try {
    const initialized = await initializeTransaction({
      email: buyerEmail,
      amount: Number(payment.amount),
      currency: payment.currency,
      reference: payment.reference,
      ...(env.PAYSTACK_CALLBACK_URL
        ? { callback_url: env.PAYSTACK_CALLBACK_URL }
        : {}),
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        buyer_id: order.buyer_id,
        farmer_id: order.farmer_id,
      },
    });

    if (initialized.reference !== payment.reference) {
      throw serviceError(
        "Paystack returned a different transaction reference.",
        "PAYSTACK_INVALID_RESPONSE",
      );
    }

    await payment.update({
      authorization_url: initialized.authorization_url,
      provider_access_code: initialized.access_code,
      last_error: null,
      raw_response: initialized as unknown as Record<string, unknown>,
    });

    return {
      payment: buildPaymentSummary(payment),
      authorization_url: initialized.authorization_url,
      access_code: initialized.access_code,
      order: await getOrderById(userId, order.id),
    };
  } catch (error) {
    const providerError = error as Error & { code?: string; statusCode?: number };
    await payment.update({
      status: "failed",
      last_error: providerError.message,
      raw_response: { error: providerError.message },
    });
    throw serviceError(
      providerError.message,
      providerError.code ?? "PAYSTACK_ERROR",
      502,
    );
  }
}

async function applyPaymentSuccess(
  paymentId: string,
  data: Record<string, unknown>,
  transaction: Transaction,
): Promise<void> {
  const payment = await Payment.findByPk(paymentId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!payment) {
    throw serviceError("Payment not found.", "NOT_FOUND");
  }

  const providerAmount = readNumber(data, "amount");
  const providerCurrency = readString(data, "currency");
  if (providerAmount === null || providerAmount !== Number(payment.amount)) {
    throw serviceError(
      "Paystack amount does not match the payment amount.",
      "PAYMENT_AMOUNT_MISMATCH",
    );
  }
  if (
    providerCurrency !== null &&
    providerCurrency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    throw serviceError(
      "Paystack currency does not match the payment currency.",
      "PAYMENT_CURRENCY_MISMATCH",
    );
  }

  const order = await Order.findByPk(payment.order_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }

  if (payment.status === "success") {
    return;
  }
  if (order.status === "cancelled" || order.status === "refunded") {
    throw serviceError(
      `Payment succeeded for an order that is ${order.status}. A refund requires manual attention.`,
      "PAYMENT_ORDER_NOT_PAYABLE",
    );
  }

  const reservation = await consumeReservationForOrder(order, transaction);
  if (!reservation) {
    throw serviceError(
      "The inventory reservation is no longer available for payment confirmation.",
      "PAYMENT_RESERVATION_UNAVAILABLE",
    );
  }

  const previousStatus = order.status ?? "pending_payment";
  const paidAt = readString(data, "paid_at");
  const transactionId = readNumber(data, "id");

  await payment.update(
    {
      status: "success",
      channel: readString(data, "channel"),
      gateway_response: readString(data, "gateway_response"),
      provider_transaction_id: transactionId,
      paid_at: paidAt ? new Date(paidAt) : new Date(),
      verified_at: new Date(),
      raw_response: data,
      last_error: null,
    },
    { transaction },
  );

  await order.update(
    {
      status: "paid",
      payment_status: "paid",
      paid_at: paidAt ? new Date(paidAt) : new Date(),
    },
    { transaction },
  );

  if (previousStatus !== "paid") {
    await recordOrderEvent(
      order.id,
      "payment_confirmed",
      null,
      previousStatus,
      "paid",
      {
        payment_id: payment.id,
        reference: payment.reference,
        provider_transaction_id: transactionId,
        amount: Number(payment.amount),
        currency: payment.currency,
      },
      transaction,
    );
  }
}

async function applyPaymentFailure(
  paymentId: string,
  status: "failed" | "abandoned",
  data: Record<string, unknown>,
  transaction: Transaction,
): Promise<void> {
  const payment = await Payment.findByPk(paymentId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!payment || payment.status === "success") {
    return;
  }

  const order = await Order.findByPk(payment.order_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order) {
    return;
  }

  await payment.update(
    {
      status,
      channel: readString(data, "channel"),
      gateway_response: readString(data, "gateway_response"),
      raw_response: data,
      last_error:
        readString(data, "gateway_response") ?? `Payment ${status}.`,
    },
    { transaction },
  );

  if (
    ["pending_payment", "payment_failed"].includes(order.status ?? "") &&
    order.payment_status !== "paid"
  ) {
    const previousStatus = order.status ?? "pending_payment";
    await order.update(
      { status: "payment_failed", payment_status: "failed" },
      { transaction },
    );
    if (previousStatus !== "payment_failed") {
      await recordOrderEvent(
        order.id,
        "payment_failed",
        null,
        previousStatus,
        "payment_failed",
        { payment_id: payment.id, reference: payment.reference, status },
        transaction,
      );
    }
  }
}

function mapRefundStatus(status: string | null): RefundStatus {
  switch (status) {
    case "processed":
    case "success":
    case "successful":
      return "processed";
    case "failed":
      return "failed";
    case "processing":
    case "ongoing":
      return "processing";
    case "pending":
      return "pending";
    default:
      return "processing";
  }
}

async function applyRefundStatus(
  refundId: string,
  nextStatus: RefundStatus,
  providerResponse: Record<string, unknown>,
  transaction: Transaction,
): Promise<void> {
  const refund = await Refund.findByPk(refundId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!refund) {
    throw serviceError("Refund not found.", "NOT_FOUND");
  }

  if (refund.status === "processed") {
    return;
  }

  await refund.update(
    {
      status: nextStatus,
      provider_response: providerResponse,
      processed_at:
        nextStatus === "processed" ? new Date() : refund.processed_at,
      failed_at: nextStatus === "failed" ? new Date() : refund.failed_at,
    },
    { transaction },
  );

  if (nextStatus !== "processed") {
    return;
  }

  const payment = await Payment.findByPk(refund.payment_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!payment) {
    return;
  }

  const order = await Order.findByPk(refund.order_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order) {
    return;
  }

  const processedTotalRaw = await Refund.sum("amount", {
    where: { payment_id: payment.id, status: "processed" },
    transaction,
  });
  const processedTotal = Number(processedTotalRaw ?? 0);
  const isFullRefund = processedTotal >= Number(payment.amount);
  const nextPaymentStatus = isFullRefund ? "refunded" : "partially_refunded";

  const previousOrderStatus = order.status ?? "pending_payment";
  await payment.update({ status: nextPaymentStatus }, { transaction });
  await order.update(
    {
      payment_status: nextPaymentStatus,
      ...(isFullRefund
        ? { status: "refunded", refunded_at: new Date() }
        : {}),
    },
    { transaction },
  );

  if (isFullRefund) {
    await restoreConsumedReservationForRefund(order, transaction);
    if (previousOrderStatus !== "refunded") {
      await recordOrderEvent(
        order.id,
        "refunded",
        null,
        previousOrderStatus,
        "refunded",
        {
          refund_id: refund.id,
          amount: Number(refund.amount),
          currency: refund.currency,
        },
        transaction,
      );
    }
  } else {
    await recordOrderEvent(
      order.id,
      "refund_partially_processed",
      null,
      previousOrderStatus,
      previousOrderStatus,
      {
        refund_id: refund.id,
        amount: Number(refund.amount),
        total_refunded: processedTotal,
        currency: refund.currency,
      },
      transaction,
    );
  }
}

async function findRefundForProviderEvent(
  data: Record<string, unknown>,
): Promise<Refund | null> {
  const providerId =
    data.id !== undefined && data.id !== null ? String(data.id) : null;
  if (providerId) {
    const direct = await Refund.findOne({
      where: { provider_refund_id: providerId },
    });
    if (direct) return direct;
  }

  const transactionValue = data.transaction;
  let reference: string | null = null;
  if (typeof transactionValue === "string") {
    reference = transactionValue;
  } else if (
    typeof transactionValue === "object" &&
    transactionValue !== null
  ) {
    reference = readString(
      transactionValue as Record<string, unknown>,
      "reference",
    );
  }

  if (!reference) {
    reference = readString(data, "reference");
  }
  if (!reference) {
    return null;
  }

  const payment = await Payment.findOne({ where: { reference } });
  if (!payment) {
    return null;
  }

  return Refund.findOne({
    where: {
      payment_id: payment.id,
      status: { [Op.in]: ["pending", "processing"] },
    },
    order: [["created_at", "DESC"]],
  });
}

async function processPaystackEvent(
  event: PaystackEventPayload,
  transaction: Transaction,
): Promise<void> {
  const reference = readString(event.data, "reference");
  const payment =
    reference === null
      ? null
      : await Payment.findOne({ where: { reference }, transaction });

  if (event.event === "charge.success") {
    if (!payment) return;
    await applyPaymentSuccess(payment.id, event.data, transaction);
    return;
  }

  if (event.event === "charge.failed") {
    if (!payment) return;
    await applyPaymentFailure(payment.id, "failed", event.data, transaction);
    return;
  }

  if (
    event.event.startsWith("refund.") ||
    event.event === "charge.reversed"
  ) {
    const refund = await findRefundForProviderEvent(event.data);
    if (!refund) return;
    const nextStatus = mapRefundStatus(readString(event.data, "status"));
    await applyRefundStatus(
      refund.id,
      nextStatus,
      event.data,
      transaction,
    );
  }
}

interface WebhookHeaders {
  signatureHeader: string | undefined;
  legacySignatureHeader: string | undefined;
}

export async function handlePaystackWebhook(
  rawBody: Buffer,
  headers: WebhookHeaders,
): Promise<{
  duplicate: boolean;
  processed: boolean;
  event_id: string;
}> {
  const verification = verifyPaystackWebhookSignature({
    rawBody,
    signatureHeader: headers.signatureHeader,
    legacySignatureHeader: headers.legacySignatureHeader,
    webhookSigningSecret: env.PAYSTACK_WEBHOOK_SIGNING_SECRET,
    secretKey: env.PAYSTACK_SECRET_KEY,
  });

  if (!verification.valid) {
    throw serviceError(
      "Invalid Paystack webhook signature.",
      "INVALID_SIGNATURE",
      401,
    );
  }

  let payload: PaystackEventPayload;
  try {
    const parsed = JSON.parse(rawBody.toString("utf8")) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { event?: unknown }).event !== "string" ||
      typeof (parsed as { data?: unknown }).data !== "object" ||
      (parsed as { data?: unknown }).data === null
    ) {
      throw new Error("Invalid payload.");
    }
    payload = parsed as PaystackEventPayload;
  } catch {
    throw serviceError("Invalid Paystack webhook payload.", "INVALID_PAYLOAD", 400);
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const reference =
    readString(payload.data, "reference") ??
    (typeof payload.data.transaction === "object" &&
    payload.data.transaction !== null
      ? readString(
          payload.data.transaction as Record<string, unknown>,
          "reference",
        )
      : null);

  let event: PaymentWebhookEvent;
  let duplicate = false;
  try {
    event = await PaymentWebhookEvent.create({
      provider: "paystack",
      event_type: payload.event,
      reference,
      payload_hash: payloadHash,
      payload: payload as unknown as Record<string, unknown>,
      signature_scheme: verification.scheme ?? null,
    });
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) {
      throw error;
    }
    const existing = await PaymentWebhookEvent.findOne({
      where: { provider: "paystack", payload_hash: payloadHash },
    });
    if (!existing) {
      throw error;
    }
    event = existing;
    duplicate = true;
  }

  if (event.processed) {
    return { duplicate: true, processed: true, event_id: event.id };
  }

  try {
    await sequelize.transaction(async (transaction) => {
      const locked = await PaymentWebhookEvent.findByPk(event.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked || locked.processed) {
        return;
      }
      await processPaystackEvent(payload, transaction);
      await locked.update(
        {
          processed: true,
          processed_at: new Date(),
          error_message: null,
          reference,
          signature_scheme: verification.scheme ?? locked.signature_scheme,
        },
        { transaction },
      );
    });
  } catch (error) {
    const message = (error as Error).message;
    await PaymentWebhookEvent.update(
      { error_message: message },
      { where: { id: event.id } },
    );
    throw error;
  }

  if (reference) {
    try {
      const payment = await Payment.findOne({ where: { reference } });
      if (payment) {
        const order = await getOrderDataById(payment.order_id);
        const action = payload.event === "charge.success"
          ? "payment_confirmed"
          : payload.event === "charge.failed"
            ? "payment_failed"
            : payload.event.startsWith("refund.")
              ? "refund_updated"
              : "payment_updated";
        publishOrderUpdated(order, action, null);
      }
    } catch {
      void 0;
    }
  }

  return {
    duplicate,
    processed: true,
    event_id: event.id,
  };
}

export async function verifyPayment(
  userId: string,
  reference: string,
): Promise<{
  payment: OrderPaymentSummary;
  order: Awaited<ReturnType<typeof getOrderById>>;
}> {
  const initial = await findPaymentForUser(userId, reference);

  if (!["pending", "failed", "abandoned"].includes(initial.status ?? "")) {
    return {
      payment: buildPaymentSummary(initial),
      order: await getOrderById(userId, initial.order_id),
    };
  }

  if (!isPaystackConfigured()) {
    throw serviceError(
      "Paystack is not configured on this server.",
      "PAYSTACK_NOT_CONFIGURED",
      503,
    );
  }

  const provider = await verifyTransaction(reference);
  if (provider.reference !== reference) {
    throw serviceError(
      "Paystack returned a different transaction reference.",
      "PAYSTACK_INVALID_RESPONSE",
    );
  }

  await sequelize.transaction(async (transaction) => {
    if (provider.status === "success") {
      await applyPaymentSuccess(
        initial.id,
        provider as unknown as Record<string, unknown>,
        transaction,
      );
      return;
    }

    if (["failed", "abandoned", "reversed"].includes(provider.status)) {
      await applyPaymentFailure(
        initial.id,
        provider.status === "failed" ? "failed" : "abandoned",
        provider as unknown as Record<string, unknown>,
        transaction,
      );
    }
  });

  const refreshed = await findPaymentForUser(userId, reference);
  const order = await getOrderById(userId, refreshed.order_id);
  if (refreshed.status !== initial.status) {
    publishOrderUpdated(
      order,
      refreshed.status === "success"
        ? "payment_confirmed"
        : "payment_updated",
      userId,
    );
  }
  return {
    payment: buildPaymentSummary(refreshed),
    order,
  };
}

export async function listOrderPayments(
  userId: string,
  orderId: string,
): Promise<OrderPaymentSummary[]> {
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  if (order.buyer_id !== userId && order.farmer_id !== userId) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }

  const payments = await Payment.findAll({
    where: { order_id: orderId },
    order: [["created_at", "DESC"]],
  });
  return payments.map(buildPaymentSummary);
}

export async function requestRefund(
  userId: string,
  reference: string,
  input: RefundRequestInput,
): Promise<{ refund: RefundData }> {
  if (!isPaystackConfigured()) {
    throw serviceError(
      "Paystack is not configured on this server.",
      "PAYSTACK_NOT_CONFIGURED",
      503,
    );
  }

  const payment = await findPaymentForUser(userId, reference);
  if (!payment.order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  if (!["success", "partially_refunded"].includes(payment.status ?? "")) {
    throw serviceError(
      "Only a successful payment can be refunded.",
      "INVALID_OPERATION",
    );
  }

  const requestedMinor =
    input.amount === undefined
      ? undefined
      : toMinorUnits(input.amount, payment.currency);

  const refund = await sequelize.transaction(async (transaction) => {
    const lockedPayment = await Payment.findByPk(payment.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedPayment) {
      throw serviceError("Payment not found.", "NOT_FOUND");
    }

    const committedRaw = await Refund.sum("amount", {
      where: {
        payment_id: lockedPayment.id,
        status: { [Op.in]: ["pending", "processing", "processed"] },
      },
      transaction,
    });
    const committed = Number(committedRaw ?? 0);
    const remaining = Number(lockedPayment.amount) - committed;
    if (remaining <= 0) {
      throw serviceError(
        "This payment has already been fully refunded.",
        "INVALID_OPERATION",
      );
    }

    const amount = requestedMinor ?? remaining;
    if (amount <= 0 || amount > remaining) {
      throw serviceError(
        `Refund amount must be greater than zero and no more than ${fromMinorUnits(
          remaining,
          lockedPayment.currency,
        )} ${lockedPayment.currency}.`,
        "INVALID_OPERATION",
      );
    }

    const created = await Refund.create(
      {
        order_id: lockedPayment.order_id,
        payment_id: lockedPayment.id,
        requested_by_user_id: userId,
        provider: "paystack",
        transaction_reference: lockedPayment.reference,
        amount,
        currency: lockedPayment.currency,
        status: "pending",
        customer_note: input.customer_note ?? null,
        merchant_note: input.merchant_note ?? null,
      },
      { transaction },
    );

    await recordOrderEvent(
      lockedPayment.order_id,
      "refund_requested",
      userId,
      payment.order!.status,
      payment.order!.status,
      {
        refund_id: created.id,
        payment_id: lockedPayment.id,
        amount,
        currency: lockedPayment.currency,
      },
      transaction,
    );

    return created;
  });

  try {
    const providerRefund = await createRefund({
      transaction: payment.reference,
      amount: Number(refund.amount),
      currency: refund.currency,
      ...(input.customer_note
        ? { customer_note: input.customer_note }
        : {}),
      ...(input.merchant_note
        ? { merchant_note: input.merchant_note }
        : {}),
    });

    const nextStatus = mapRefundStatus(providerRefund.status);
    await sequelize.transaction(async (transaction) => {
      const locked = await Refund.findByPk(refund.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked) {
        throw serviceError("Refund not found.", "NOT_FOUND");
      }
      await locked.update(
        {
          provider_refund_id: String(providerRefund.id),
          provider_response:
            providerRefund as unknown as Record<string, unknown>,
        },
        { transaction },
      );
      await applyRefundStatus(
        locked.id,
        nextStatus,
        providerRefund as unknown as Record<string, unknown>,
        transaction,
      );
    });
  } catch (error) {
    const providerError = error as Error & { code?: string };
    await refund.update({
      status: "needs_attention",
      provider_response: { error: providerError.message },
    });
    throw serviceError(
      providerError.message,
      providerError.code ?? "PAYSTACK_REFUND_FAILED",
      502,
    );
  }

  const refreshed = await Refund.findByPk(refund.id);
  if (!refreshed) {
    throw serviceError("Refund not found.", "NOT_FOUND");
  }
  publishOrderUpdated(
    await getOrderDataById(refreshed.order_id),
    "refund_requested",
    userId,
  );
  return { refund: buildRefundData(refreshed) };
}

export async function getRefundsForPayment(
  userId: string,
  reference: string,
): Promise<{ payment: OrderPaymentSummary; refunds: RefundData[] }> {
  const payment = await findPaymentForUser(userId, reference);

  if (isPaystackConfigured()) {
    const pendingRefunds = await Refund.findAll({
      where: {
        payment_id: payment.id,
        status: { [Op.in]: ["pending", "processing"] },
        provider_refund_id: { [Op.ne]: null },
      },
    });

    for (const pendingRefund of pendingRefunds) {
      try {
        const providerRefund = await fetchRefund(
          pendingRefund.provider_refund_id!,
        );
        const nextStatus = mapRefundStatus(providerRefund.status);
        await sequelize.transaction(async (transaction) => {
          await applyRefundStatus(
            pendingRefund.id,
            nextStatus,
            providerRefund as unknown as Record<string, unknown>,
            transaction,
          );
        });
      } catch {
        // Keep the last known local status when Paystack is unreachable.
      }
    }
  }

  const refreshedPayment = await findPaymentForUser(userId, reference);
  const refunds = await Refund.findAll({
    where: { payment_id: refreshedPayment.id },
    order: [["created_at", "DESC"]],
  });

  return {
    payment: buildPaymentSummary(refreshedPayment),
    refunds: refunds.map(buildRefundData),
  };
}
