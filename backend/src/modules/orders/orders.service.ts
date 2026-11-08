import { randomBytes } from "node:crypto";
import {
  Op,
  UniqueConstraintError,
  type Includeable,
  type Transaction,
  type WhereOptions,
} from "sequelize";
import { env } from "../../config/env.js";
import {
  InventoryReservation,
  Offer,
  Order,
  OrderEvent,
  OrderItem,
  Payment,
  ProduceListing,
  User,
  sequelize,
} from "../../database/models/index.js";
import type {
  OrderPaymentStatus,
  OrderStatus,
} from "../../database/models/order.model.js";
import type { PaymentStatus } from "../../database/models/payment.model.js";
import {
  compareDecimal,
  multiplyDecimal,
  normalizeDecimal,
} from "../listings/decimal.js";
import { fromMinorUnits } from "../../utils/money.js";
import {
  buildReservationData,
  releaseReservationForOrder,
  reserveInventoryForOrder,
} from "./reservations.service.js";
import { recordOrderEvent } from "./orders.events.js";
import type {
  CancelOrderInput,
  CreateOrderInput,
  ListOrdersQuery,
  ListReservationsQuery,
  UpdateOrderStatusInput,
} from "./orders.validation.js";
import type {
  OrderData,
  OrderEventData,
  OrderHistory,
  OrderItemData,
  OrderListingSummary,
  OrderPaymentSummary,
  OrderReservationData,
  PaginatedOrders,
  PaginatedReservations,
} from "./orders.types.js";

const QUANTITY_SCALE = 3;
const PRICE_SCALE = 2;
const AMOUNT_SCALE = 2;

type OrderRow = Order & {
  buyer?: User;
  farmer?: User;
  listing?: ProduceListing;
  item?: OrderItem;
  reservation?: InventoryReservation;
  payments?: Payment[];
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function buildListingSummary(row: ProduceListing): OrderListingSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status ?? "draft",
    farmer_user_id: row.farmer_user_id,
    available_quantity: Number(row.available_quantity ?? 0),
    reserved_quantity: Number(row.reserved_quantity ?? 0),
    sold_quantity: Number(row.sold_quantity ?? 0),
    unit: row.unit ?? "kg",
    price_per_unit: Number(row.price_per_unit),
    currency: row.currency ?? "NGN",
    expiry_date: row.expiry_date ?? null,
  };
}

function buildItemData(row: OrderItem): OrderItemData {
  return {
    id: row.id,
    order_id: row.order_id,
    listing_id: row.listing_id ?? null,
    title: row.title,
    quantity: Number(row.quantity),
    unit: row.unit,
    unit_price: Number(row.unit_price),
    line_total: Number(row.line_total),
  };
}

export function buildPaymentSummary(row: Payment): OrderPaymentSummary {
  const amountMinor = Number(row.amount);
  return {
    id: row.id,
    reference: row.reference,
    provider: row.provider ?? "paystack",
    amount_minor: amountMinor,
    amount: fromMinorUnits(amountMinor, row.currency),
    currency: row.currency,
    status: (row.status ?? "pending") as PaymentStatus,
    authorization_url: row.authorization_url ?? null,
    access_code: row.provider_access_code ?? null,
    channel: row.channel ?? null,
    gateway_response: row.gateway_response ?? null,
    paid_at: row.paid_at ?? null,
    verified_at: row.verified_at ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

export function buildOrderData(row: OrderRow): OrderData {
  return {
    id: row.id,
    order_number: row.order_number,
    offer_id: row.offer_id,
    listing_id: row.listing_id ?? null,
    buyer_id: row.buyer_id,
    farmer_id: row.farmer_id,
    quantity: Number(row.quantity),
    unit: row.unit,
    unit_price: Number(row.unit_price),
    total_amount: Number(row.total_amount),
    currency: row.currency ?? "NGN",
    status: (row.status ?? "pending_payment") as OrderStatus,
    payment_status: (row.payment_status ?? "pending") as OrderPaymentStatus,
    delivery_terms: row.delivery_terms ?? null,
    delivery_location: row.delivery_location ?? null,
    delivery_date: row.delivery_date ?? null,
    buyer_message: row.buyer_message ?? null,
    reservation_expires_at: row.reservation_expires_at ?? null,
    paid_at: row.paid_at ?? null,
    cancelled_at: row.cancelled_at ?? null,
    completed_at: row.completed_at ?? null,
    refunded_at: row.refunded_at ?? null,
    cancellation_reason: row.cancellation_reason ?? null,
    buyer: row.buyer
      ? { id: row.buyer.id, display_name: row.buyer.display_name ?? null }
      : undefined,
    farmer: row.farmer
      ? { id: row.farmer.id, display_name: row.farmer.display_name ?? null }
      : undefined,
    listing: row.listing ? buildListingSummary(row.listing) : undefined,
    item: row.item ? buildItemData(row.item) : undefined,
    reservation: row.reservation
      ? buildReservationData(row.reservation)
      : undefined,
    payments: row.payments?.map(buildPaymentSummary),
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildEventData(row: OrderEvent): OrderEventData {
  return {
    id: row.id,
    order_id: row.order_id,
    actor_user_id: row.actor_user_id ?? null,
    action: row.action,
    previous_status: row.previous_status ?? null,
    new_status: row.new_status ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at!,
  };
}

const orderIncludes: Includeable[] = [
  { model: User, as: "buyer", attributes: ["id", "display_name"] },
  { model: User, as: "farmer", attributes: ["id", "display_name"] },
  {
    model: ProduceListing,
    as: "listing",
    attributes: [
      "id",
      "title",
      "status",
      "farmer_user_id",
      "available_quantity",
      "reserved_quantity",
      "sold_quantity",
      "unit",
      "price_per_unit",
      "currency",
      "expiry_date",
    ],
  },
  { model: OrderItem, as: "item" },
  { model: InventoryReservation, as: "reservation" },
  {
    model: Payment,
    as: "payments",
    separate: true,
    order: [["created_at", "DESC"]],
  },
];

async function loadOrderRow(
  id: string,
  transaction?: Transaction,
): Promise<OrderRow> {
  const order = (await Order.findByPk(id, {
    include: orderIncludes,
    transaction,
  })) as OrderRow | null;
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  return order;
}

function assertParticipant(order: Order, userId: string): void {
  if (order.buyer_id !== userId && order.farmer_id !== userId) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof UniqueConstraintError;
}

export async function createOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<OrderData> {
  let orderId: string;

  try {
    orderId = await sequelize.transaction(async (transaction) => {
      const offer = await Offer.findByPk(input.offer_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!offer) {
        throw serviceError("Offer not found.", "NOT_FOUND");
      }
      if (offer.status !== "accepted") {
        throw serviceError(
          `Only accepted offers can be converted to an order. This offer is ${offer.status}.`,
          "INVALID_OPERATION",
        );
      }
      if (offer.buyer_id !== userId) {
        throw serviceError(
          "Only the buyer can create an order from an accepted offer.",
          "FORBIDDEN",
        );
      }
      if (!offer.listing_id) {
        throw serviceError(
          "This accepted offer is not linked to a produce listing, so inventory cannot be reserved.",
          "INVALID_OPERATION",
        );
      }

      const existing = await Order.findOne({
        where: { offer_id: offer.id },
        transaction,
      });
      if (existing) {
        throw serviceError(
          "An order has already been created for this offer.",
          "CONFLICT",
        );
      }

      const listing = await ProduceListing.findByPk(offer.listing_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!listing) {
        throw serviceError("Listing not found.", "NOT_FOUND");
      }
      if (listing.farmer_user_id !== offer.farmer_id) {
        throw serviceError(
          "The offer's listing no longer belongs to the expected farmer.",
          "INVALID_OPERATION",
        );
      }
      if (listing.status !== "published") {
        throw serviceError(
          `The listing is ${listing.status} and cannot accept new orders.`,
          "INVALID_OPERATION",
        );
      }

      const today = todayIsoDate();
      if (listing.expiry_date && listing.expiry_date < today) {
        throw serviceError(
          "The listing's produce has expired and cannot be ordered.",
          "INVALID_OPERATION",
        );
      }
      if (listing.available_from && listing.available_from > today) {
        throw serviceError(
          "The listing's produce is not yet available.",
          "INVALID_OPERATION",
        );
      }

      const quantity = normalizeDecimal(offer.quantity, QUANTITY_SCALE);
      if (compareDecimal(quantity, "0", QUANTITY_SCALE) <= 0) {
        throw serviceError(
          "Order quantity must be greater than zero.",
          "INVALID_OPERATION",
        );
      }
      const available = normalizeDecimal(
        listing.available_quantity ?? 0,
        QUANTITY_SCALE,
      );
      if (compareDecimal(quantity, available, QUANTITY_SCALE) > 0) {
        throw serviceError(
          "The agreed quantity is no longer available in inventory.",
          "INVALID_OPERATION",
        );
      }

      const unitPrice = normalizeDecimal(offer.unit_price, PRICE_SCALE);
      const totalAmount = multiplyDecimal(
        offer.quantity,
        QUANTITY_SCALE,
        offer.unit_price,
        PRICE_SCALE,
        AMOUNT_SCALE,
      );
      if (compareDecimal(totalAmount, "0", AMOUNT_SCALE) <= 0) {
        throw serviceError(
          "Order total must be greater than zero.",
          "INVALID_OPERATION",
        );
      }

      const reservationExpiresAt = new Date(
        Date.now() + env.ORDER_RESERVATION_MINUTES * 60 * 1000,
      );

      const order = await Order.create(
        {
          order_number: buildOrderNumber(),
          offer_id: offer.id,
          listing_id: listing.id,
          buyer_id: offer.buyer_id,
          farmer_id: offer.farmer_id,
          quantity: quantity as unknown as number,
          unit: offer.unit,
          unit_price: unitPrice as unknown as number,
          total_amount: totalAmount as unknown as number,
          currency: offer.currency ?? listing.currency ?? "NGN",
          status: "pending_payment",
          payment_status: "pending",
          delivery_terms: offer.delivery_terms ?? null,
          delivery_location: offer.delivery_location ?? null,
          delivery_date: offer.delivery_date ?? null,
          buyer_message: offer.buyer_message ?? null,
          reservation_expires_at: reservationExpiresAt,
        },
        { transaction },
      );

      await OrderItem.create(
        {
          order_id: order.id,
          listing_id: listing.id,
          title: listing.title,
          quantity: quantity as unknown as number,
          unit: offer.unit,
          unit_price: unitPrice as unknown as number,
          line_total: totalAmount as unknown as number,
        },
        { transaction },
      );

      await reserveInventoryForOrder(order, listing, transaction);

      await recordOrderEvent(
        order.id,
        "created",
        userId,
        null,
        "pending_payment",
        {
          offer_id: offer.id,
          listing_id: listing.id,
          reservation_expires_at: reservationExpiresAt.toISOString(),
          quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          currency: order.currency,
        },
        transaction,
      );

      return order.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw serviceError(
        "An order has already been created for this offer.",
        "CONFLICT",
      );
    }
    throw error;
  }

  return buildOrderData(await loadOrderRow(orderId));
}

export async function getOrderDataById(id: string): Promise<OrderData> {
  return buildOrderData(await loadOrderRow(id));
}

export async function listOrders(
  userId: string,
  filters: ListOrdersQuery,
): Promise<PaginatedOrders> {
  const participant: WhereOptions =
    filters.role === "buyer"
      ? { buyer_id: userId }
      : filters.role === "farmer"
        ? { farmer_id: userId }
        : { [Op.or]: [{ buyer_id: userId }, { farmer_id: userId }] };

  const where: WhereOptions = { ...participant };
  const mutableWhere = where as Record<string, unknown>;
  if (filters.status) mutableWhere.status = filters.status;
  if (filters.payment_status) {
    mutableWhere.payment_status = filters.payment_status;
  }
  if (filters.listing_id) mutableWhere.listing_id = filters.listing_id;
  if (filters.offer_id) mutableWhere.offer_id = filters.offer_id;

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: orderIncludes,
    order: [
      ["created_at", filters.sort === "oldest" ? "ASC" : "DESC"],
      ["id", "ASC"],
    ],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
  });

  const total = Number(count);
  return {
    orders: (rows as OrderRow[]).map(buildOrderData),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(total / filters.limit),
  };
}

export async function getOrderById(
  userId: string,
  id: string,
): Promise<OrderData> {
  const order = await loadOrderRow(id);
  assertParticipant(order, userId);
  return buildOrderData(order);
}

export async function getOrderHistory(
  userId: string,
  id: string,
): Promise<OrderHistory> {
  const order = await Order.findByPk(id);
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  assertParticipant(order, userId);

  const events = await OrderEvent.findAll({
    where: { order_id: id },
    order: [
      ["created_at", "ASC"],
      ["id", "ASC"],
    ],
  });

  return {
    order_id: id,
    events: events.map(buildEventData),
  };
}

export async function getOrderReservation(
  userId: string,
  orderId: string,
): Promise<OrderReservationData> {
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  assertParticipant(order, userId);

  const reservation = await InventoryReservation.findOne({
    where: { order_id: orderId },
  });
  if (!reservation) {
    throw serviceError("Reservation not found for this order.", "NOT_FOUND");
  }
  return buildReservationData(reservation);
}

export async function listReservations(
  userId: string,
  filters: ListReservationsQuery,
): Promise<PaginatedReservations> {
  const orderWhere: WhereOptions = {
    [Op.or]: [{ buyer_id: userId }, { farmer_id: userId }],
  };

  const where: WhereOptions = {};
  const mutableWhere = where as Record<string, unknown>;
  if (filters.status) mutableWhere.status = filters.status;
  if (filters.order_id) mutableWhere.order_id = filters.order_id;
  if (filters.listing_id) mutableWhere.listing_id = filters.listing_id;

  const { rows, count } = await InventoryReservation.findAndCountAll({
    where,
    include: [
      {
        model: Order,
        as: "order",
        attributes: ["id", "buyer_id", "farmer_id"],
        required: true,
        where: orderWhere,
      },
    ],
    order: [["created_at", "DESC"]],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
  });

  const total = Number(count);
  return {
    reservations: rows.map(buildReservationData),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(total / filters.limit),
  };
}

const MANUAL_TRANSITIONS: Record<
  UpdateOrderStatusInput["status"],
  { from: OrderStatus; actor: "buyer" | "farmer" }
> = {
  processing: { from: "paid", actor: "farmer" },
  ready_for_delivery: { from: "processing", actor: "farmer" },
  in_transit: { from: "ready_for_delivery", actor: "farmer" },
  delivered: { from: "in_transit", actor: "farmer" },
  completed: { from: "delivered", actor: "buyer" },
};

export async function updateOrderStatus(
  userId: string,
  id: string,
  input: UpdateOrderStatusInput,
): Promise<OrderData> {
  await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) {
      throw serviceError("Order not found.", "NOT_FOUND");
    }
    assertParticipant(order, userId);

    const transition = MANUAL_TRANSITIONS[input.status];
    const expectedActorId =
      transition.actor === "farmer" ? order.farmer_id : order.buyer_id;
    if (userId !== expectedActorId) {
      throw serviceError(
        `Only the ${transition.actor} can move this order to ${input.status}.`,
        "FORBIDDEN",
      );
    }
    if (order.status !== transition.from) {
      throw serviceError(
        `Order cannot move from ${order.status} to ${input.status}.`,
        "INVALID_OPERATION",
      );
    }

    await order.update(
      {
        status: input.status,
        ...(input.status === "completed"
          ? { completed_at: new Date() }
          : {}),
      },
      { transaction },
    );
    await recordOrderEvent(
      order.id,
      "status_changed",
      userId,
      transition.from,
      input.status,
      { status: input.status },
      transaction,
    );
  });

  return buildOrderData(await loadOrderRow(id));
}

const DELIVERY_ORDER_SYNC_TRANSITIONS: Partial<
  Record<OrderStatus, OrderStatus[]>
> = {
  processing: ["paid"],
  ready_for_delivery: ["paid", "processing"],
  in_transit: ["processing", "ready_for_delivery"],
  delivered: ["in_transit"],
  completed: ["delivered"],
};

/**
 * Move an order forward to reflect a delivery lifecycle event. This only ever
 * advances paid orders and never touches payment_status. It is a no-op when the
 * order is missing, unpaid, already at/after the target, or in an unexpected
 * status, so delivery flows cannot corrupt order/payment state.
 */
export async function syncOrderStatusForDelivery(
  orderId: string,
  targetStatus: OrderStatus,
  actorUserId: string | null,
  deliveryId: string,
  transaction: Transaction,
): Promise<boolean> {
  const order = await Order.findByPk(orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order) {
    return false;
  }

  if (order.payment_status !== "paid") {
    return false;
  }

  const currentStatus = (order.status ?? "pending_payment") as OrderStatus;
  if (currentStatus === targetStatus) {
    return false;
  }

  const allowedFrom = DELIVERY_ORDER_SYNC_TRANSITIONS[targetStatus] ?? [];
  if (!allowedFrom.includes(currentStatus)) {
    return false;
  }

  await order.update(
    {
      status: targetStatus,
      ...(targetStatus === "completed"
        ? { completed_at: new Date() }
        : {}),
    },
    { transaction },
  );

  await recordOrderEvent(
    order.id,
    "delivery_status_synced",
    actorUserId,
    currentStatus,
    targetStatus,
    { delivery_id: deliveryId, delivery_target_status: targetStatus },
    transaction,
  );

  return true;
}

export async function cancelOrder(
  userId: string,
  id: string,
  input: CancelOrderInput,
): Promise<OrderData> {
  await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) {
      throw serviceError("Order not found.", "NOT_FOUND");
    }
    assertParticipant(order, userId);

    if (!["pending_payment", "payment_failed"].includes(order.status ?? "")) {
      throw serviceError(
        order.payment_status === "paid"
          ? "A paid order must be refunded before it can be cancelled."
          : `An order in ${order.status} status cannot be cancelled.`,
        "INVALID_OPERATION",
      );
    }

    const previousStatus = order.status ?? "pending_payment";
    await releaseReservationForOrder(order, "order_cancelled", transaction);
    await order.update(
      {
        status: "cancelled",
        cancelled_at: new Date(),
        cancellation_reason: input.reason,
      },
      { transaction },
    );
    await Payment.update(
      { status: "abandoned" },
      {
        where: { order_id: order.id, status: "pending" },
        transaction,
      },
    );
    await recordOrderEvent(
      order.id,
      "cancelled",
      userId,
      previousStatus,
      "cancelled",
      { reason: input.reason },
      transaction,
    );
  });

  return buildOrderData(await loadOrderRow(id));
}
