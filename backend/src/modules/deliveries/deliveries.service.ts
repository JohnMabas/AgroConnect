import { randomBytes } from "node:crypto";
import {
  Op,
  UniqueConstraintError,
  type Includeable,
  type InferAttributes,
  type Transaction,
  type WhereOptions,
} from "sequelize";
import {
  Delivery,
  DeliveryHistory,
  Order,
  OrderItem,
  TransporterProfile,
  User,
  sequelize,
} from "../../database/models/index.js";
import type { DeliveryStatus } from "../../database/models/delivery.model.js";
import type { OrderStatus } from "../../database/models/order.model.js";
import {
  compareDecimal,
  normalizeDecimal,
} from "../listings/decimal.js";
import { fromMinorUnits, toMinorUnits } from "../../utils/money.js";
import { syncOrderStatusForDelivery } from "../orders/orders.service.js";
import { transporterCoversLocation } from "../transporters/transporters.service.js";
import type {
  CreateDeliveryInput,
  DeclineDeliveryInput,
  ListDeliveriesQuery,
  UpdateDeliveryStatusInput,
} from "./deliveries.validation.js";
import type {
  DeliveryData,
  DeliveryHistoryData,
  DeliveryHistoryEventData,
  DeliveryOrderSummary,
  PaginatedDeliveries,
} from "./deliveries.types.js";

const QUANTITY_SCALE = 3;
const ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "ready_for_delivery",
];
const TERMINAL_DELIVERY_STATUSES: DeliveryStatus[] = [
  "completed",
  "cancelled",
  "failed",
];

type DeliveryRow = Delivery & {
  order?: Order;
  buyer?: User;
  farmer?: User;
  transporter?: User;
  creator?: User;
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function normalizePlace(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildDeliveryReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `DLV-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

const deliveryIncludes: Includeable[] = [
  {
    model: Order,
    as: "order",
    attributes: [
      "id",
      "order_number",
      "status",
      "payment_status",
      "quantity",
      "unit",
      "total_amount",
      "currency",
      "delivery_location",
      "delivery_date",
    ],
  },
  {
    model: User,
    as: "buyer",
    attributes: ["id", "display_name"],
  },
  {
    model: User,
    as: "farmer",
    attributes: ["id", "display_name"],
  },
  {
    model: User,
    as: "transporter",
    attributes: ["id", "display_name"],
  },
];

function buildOrderSummary(row: Order): DeliveryOrderSummary {
  return {
    id: row.id,
    order_number: row.order_number,
    status: row.status ?? "pending_payment",
    payment_status: row.payment_status ?? "pending",
    quantity: Number(row.quantity),
    unit: row.unit,
    total_amount: Number(row.total_amount),
    currency: row.currency ?? "NGN",
    delivery_location: row.delivery_location ?? null,
    delivery_date: row.delivery_date ?? null,
  };
}

function buildDeliveryData(row: DeliveryRow): DeliveryData {
  const feeMinor = Number(row.delivery_fee_minor ?? 0);
  const currency = row.currency ?? "NGN";

  return {
    id: row.id,
    delivery_reference: row.delivery_reference,
    order_id: row.order_id,
    farmer_id: row.farmer_id,
    buyer_id: row.buyer_id,
    transporter_id: row.transporter_id ?? null,
    pickup_location: row.pickup_location,
    delivery_location: row.delivery_location,
    produce_description: row.produce_description,
    quantity: Number(row.quantity),
    unit: row.unit,
    expected_pickup_date: row.expected_pickup_date,
    expected_delivery_date: row.expected_delivery_date,
    delivery_fee_minor: feeMinor,
    delivery_fee: fromMinorUnits(feeMinor, currency),
    currency,
    additional_instructions: row.additional_instructions ?? null,
    status: (row.status ?? "pending") as DeliveryStatus,
    created_by_user_id: row.created_by_user_id ?? null,
    assigned_at: row.assigned_at ?? null,
    accepted_at: row.accepted_at ?? null,
    picked_up_at: row.picked_up_at ?? null,
    delivered_at: row.delivered_at ?? null,
    completed_at: row.completed_at ?? null,
    cancelled_at: row.cancelled_at ?? null,
    failed_at: row.failed_at ?? null,
    cancellation_reason: row.cancellation_reason ?? null,
    failure_reason: row.failure_reason ?? null,
    order: row.order ? buildOrderSummary(row.order) : undefined,
    buyer: row.buyer
      ? { id: row.buyer.id, display_name: row.buyer.display_name ?? null }
      : undefined,
    farmer: row.farmer
      ? { id: row.farmer.id, display_name: row.farmer.display_name ?? null }
      : undefined,
    transporter: row.transporter
      ? {
          id: row.transporter.id,
          display_name: row.transporter.display_name ?? null,
        }
      : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildHistoryEventData(row: DeliveryHistory): DeliveryHistoryEventData {
  return {
    id: row.id,
    delivery_id: row.delivery_id,
    actor_user_id: row.actor_user_id ?? null,
    action: row.action,
    previous_status: row.previous_status ?? null,
    new_status: row.new_status ?? null,
    description: row.description ?? null,
    location: row.location ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: row.created_at!,
  };
}

async function recordDeliveryEvent(
  deliveryId: string,
  action: string,
  actorUserId: string | null,
  previousStatus: string | null,
  newStatus: string | null,
  description: string | null,
  location: string | null,
  metadata: Record<string, unknown> | null,
  transaction: Transaction,
): Promise<DeliveryHistory> {
  return DeliveryHistory.create(
    {
      delivery_id: deliveryId,
      actor_user_id: actorUserId,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      description,
      location,
      metadata,
    },
    { transaction },
  );
}

async function loadDeliveryRow(
  id: string,
  transaction?: Transaction,
): Promise<DeliveryRow> {
  const row = (await Delivery.findByPk(id, {
    include: deliveryIncludes,
    transaction,
  })) as DeliveryRow | null;
  if (!row) {
    throw serviceError("Delivery not found.", "NOT_FOUND");
  }
  return row;
}

function assertCanView(
  delivery: Delivery,
  userId: string,
  roles: string[],
): void {
  if (roles.includes("admin")) {
    return;
  }
  if (
    delivery.buyer_id === userId ||
    delivery.farmer_id === userId ||
    delivery.transporter_id === userId
  ) {
    return;
  }
  throw serviceError("Delivery not found.", "NOT_FOUND");
}

function resolveFeeMinor(amount: number, currency: string): number {
  try {
    return toMinorUnits(amount, currency);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "INVALID_CURRENCY") {
      throw serviceError(
        `Currency ${currency} is not supported for delivery fees.`,
        "INVALID_OPERATION",
      );
    }
    throw serviceError(
      "Delivery fee is invalid. Provide a positive amount within range.",
      "INVALID_OPERATION",
    );
  }
}

export async function createDelivery(
  userId: string,
  input: CreateDeliveryInput,
): Promise<DeliveryData> {
  let deliveryId: string;

  try {
    deliveryId = await sequelize.transaction(async (transaction) => {
      const order = await Order.findByPk(input.order_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) {
        throw serviceError("Order not found.", "NOT_FOUND");
      }
      if (order.buyer_id !== userId && order.farmer_id !== userId) {
        throw serviceError(
          "Only the buyer or farmer for this order can create a delivery request.",
          "FORBIDDEN",
        );
      }

      const orderStatus = (order.status ?? "pending_payment") as OrderStatus;
      if (!ELIGIBLE_ORDER_STATUSES.includes(orderStatus)) {
        throw serviceError(
          `A delivery cannot be created for an order in ${orderStatus} status.`,
          "INVALID_OPERATION",
        );
      }
      if (order.payment_status !== "paid") {
        throw serviceError(
          "A delivery can only be created for a paid order.",
          "INVALID_OPERATION",
        );
      }

      const existing = await Delivery.findOne({
        where: {
          order_id: order.id,
          status: { [Op.notIn]: ["cancelled", "failed"] },
        },
        transaction,
      });
      if (existing) {
        throw serviceError(
          "An active delivery already exists for this order.",
          "CONFLICT",
        );
      }

      const orderQuantity = normalizeDecimal(order.quantity, QUANTITY_SCALE);
      if (input.quantity !== undefined) {
        if (
          compareDecimal(input.quantity, orderQuantity, QUANTITY_SCALE) !== 0
        ) {
          throw serviceError(
            "The delivery quantity must match the order quantity.",
            "INVALID_OPERATION",
          );
        }
      }
      if (input.unit !== undefined && input.unit !== order.unit) {
        throw serviceError(
          "The delivery unit must match the order unit.",
          "INVALID_OPERATION",
        );
      }

      const orderCurrency = (order.currency ?? "NGN").toUpperCase();
      if (input.currency !== undefined) {
        const requestedCurrency = input.currency.toUpperCase();
        if (requestedCurrency !== orderCurrency) {
          throw serviceError(
            "The delivery fee currency must match the order currency.",
            "INVALID_OPERATION",
          );
        }
      }

      const orderLocation = order.delivery_location?.trim() ?? "";
      const requestedLocation = input.delivery_location?.trim() ?? "";
      if (
        orderLocation !== "" &&
        requestedLocation !== "" &&
        normalizePlace(orderLocation) !== normalizePlace(requestedLocation)
      ) {
        throw serviceError(
          "The delivery location must match the order's delivery location.",
          "INVALID_OPERATION",
        );
      }
      const deliveryLocation = orderLocation || requestedLocation;
      if (deliveryLocation === "") {
        throw serviceError(
          "A delivery location is required. Provide one or set it on the order.",
          "INVALID_OPERATION",
        );
      }

      const orderDeliveryDate = order.delivery_date ?? null;
      if (
        orderDeliveryDate &&
        input.expected_delivery_date !== orderDeliveryDate
      ) {
        throw serviceError(
          "The expected delivery date must match the order's delivery date.",
          "INVALID_OPERATION",
        );
      }
      const expectedDeliveryDate =
        orderDeliveryDate ?? input.expected_delivery_date;
      if (expectedDeliveryDate < input.expected_pickup_date) {
        throw serviceError(
          "Expected delivery date cannot be before the pickup date.",
          "INVALID_OPERATION",
        );
      }

      const deliveryFeeMinor = resolveFeeMinor(
        input.delivery_fee,
        orderCurrency,
      );

      const item = await OrderItem.findOne({
        where: { order_id: order.id },
        transaction,
      });
      const produceDescription =
        input.produce_description?.trim() ||
        item?.title ||
        `Produce for order ${order.order_number}`;

      const delivery = await Delivery.create(
        {
          delivery_reference: buildDeliveryReference(),
          order_id: order.id,
          farmer_id: order.farmer_id,
          buyer_id: order.buyer_id,
          transporter_id: null,
          pickup_location: input.pickup_location,
          delivery_location: deliveryLocation,
          produce_description: produceDescription,
          quantity: orderQuantity as unknown as number,
          unit: order.unit,
          expected_pickup_date: input.expected_pickup_date,
          expected_delivery_date: expectedDeliveryDate,
          delivery_fee_minor: deliveryFeeMinor,
          currency: orderCurrency,
          additional_instructions:
            input.additional_instructions?.trim() || null,
          status: "pending",
          created_by_user_id: userId,
        },
        { transaction },
      );

      await recordDeliveryEvent(
        delivery.id,
        "created",
        userId,
        null,
        "pending",
        "Delivery request created.",
        input.pickup_location,
        {
          order_id: order.id,
          delivery_fee_minor: deliveryFeeMinor,
          currency: orderCurrency,
        },
        transaction,
      );

      await syncOrderStatusForDelivery(
        order.id,
        "processing",
        userId,
        delivery.id,
        transaction,
      );

      return delivery.id;
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw serviceError(
        "An active delivery already exists for this order.",
        "CONFLICT",
      );
    }
    throw error;
  }

  return buildDeliveryData(await loadDeliveryRow(deliveryId));
}

export async function listDeliveries(
  userId: string,
  roles: string[],
  filters: ListDeliveriesQuery,
): Promise<PaginatedDeliveries> {
  const where: WhereOptions = roles.includes("admin")
    ? {}
    : {
        [Op.or]: [
          { buyer_id: userId },
          { farmer_id: userId },
          { transporter_id: userId },
        ],
      };
  const mutableWhere = where as Record<string, unknown>;
  if (filters.status) mutableWhere.status = filters.status;
  if (filters.order_id) mutableWhere.order_id = filters.order_id;

  const { rows, count } = await Delivery.findAndCountAll({
    where,
    include: deliveryIncludes,
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
    deliveries: (rows as DeliveryRow[]).map(buildDeliveryData),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(total / filters.limit),
  };
}

export async function listMyDeliveries(
  userId: string,
  filters: ListDeliveriesQuery,
): Promise<PaginatedDeliveries> {
  const where: WhereOptions = {};
  const mutableWhere = where as Record<string, unknown>;
  mutableWhere.transporter_id = userId;
  if (filters.status) mutableWhere.status = filters.status;
  if (filters.order_id) mutableWhere.order_id = filters.order_id;

  const { rows, count } = await Delivery.findAndCountAll({
    where,
    include: deliveryIncludes,
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
    deliveries: (rows as DeliveryRow[]).map(buildDeliveryData),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(total / filters.limit),
  };
}

export async function getDeliveryById(
  userId: string,
  roles: string[],
  id: string,
): Promise<DeliveryData> {
  const row = await loadDeliveryRow(id);
  assertCanView(row, userId, roles);
  return buildDeliveryData(row);
}

export async function getOrderDelivery(
  userId: string,
  roles: string[],
  orderId: string,
): Promise<DeliveryData> {
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }

  const isParticipant =
    order.buyer_id === userId || order.farmer_id === userId;
  const delivery = (await Delivery.findOne({
    where: { order_id: orderId },
    include: deliveryIncludes,
    order: [
      ["created_at", "DESC"],
      ["id", "ASC"],
    ],
  })) as DeliveryRow | null;

  if (!delivery) {
    throw serviceError("No delivery exists for this order.", "NOT_FOUND");
  }

  const isAdmin = roles.includes("admin");
  const isTransporter = delivery.transporter_id === userId;
  if (!isAdmin && !isParticipant && !isTransporter) {
    throw serviceError("Delivery not found.", "NOT_FOUND");
  }

  return buildDeliveryData(delivery);
}

export async function getDeliveryHistory(
  userId: string,
  roles: string[],
  id: string,
): Promise<DeliveryHistoryData> {
  const delivery = await Delivery.findByPk(id);
  if (!delivery) {
    throw serviceError("Delivery not found.", "NOT_FOUND");
  }
  assertCanView(delivery, userId, roles);

  const events = await DeliveryHistory.findAll({
    where: { delivery_id: id },
    order: [
      ["created_at", "ASC"],
      ["id", "ASC"],
    ],
  });

  return {
    delivery_id: id,
    events: events.map(buildHistoryEventData),
  };
}

export async function assignTransporter(
  actorUserId: string,
  roles: string[],
  deliveryId: string,
  transporterId: string,
  reassign: boolean,
): Promise<DeliveryData> {
  if (!roles.includes("admin")) {
    throw serviceError(
      "Only an administrator can assign a transporter.",
      "FORBIDDEN",
    );
  }

  await sequelize.transaction(async (transaction) => {
    const delivery = await Delivery.findByPk(deliveryId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!delivery) {
      throw serviceError("Delivery not found.", "NOT_FOUND");
    }

    const currentStatus = (delivery.status ?? "pending") as DeliveryStatus;
    if (TERMINAL_DELIVERY_STATUSES.includes(currentStatus)) {
      throw serviceError(
        `A delivery in ${currentStatus} status cannot be assigned.`,
        "INVALID_OPERATION",
      );
    }

    if (reassign) {
      if (
        delivery.transporter_id === null ||
        !["assigned", "accepted"].includes(currentStatus)
      ) {
        throw serviceError(
          "Only an assigned or accepted delivery can be reassigned.",
          "INVALID_OPERATION",
        );
      }
    } else if (currentStatus !== "pending") {
      throw serviceError(
        "Only a pending delivery can be assigned to a transporter.",
        "INVALID_OPERATION",
      );
    }

    const transporterUser = await User.findByPk(transporterId, { transaction });
    if (!transporterUser) {
      throw serviceError("Transporter not found.", "NOT_FOUND");
    }
    if (transporterUser.status !== "active") {
      throw serviceError(
        "The transporter account is not active.",
        "INVALID_OPERATION",
      );
    }

    const profile = await TransporterProfile.findOne({
      where: { user_id: transporterId },
      transaction,
    });
    if (!profile) {
      throw serviceError(
        "The selected user does not have a transporter profile.",
        "INVALID_OPERATION",
      );
    }
    if (profile.approval_status !== "approved") {
      throw serviceError(
        "Only an approved transporter can be assigned.",
        "INVALID_OPERATION",
      );
    }
    if (profile.availability_status !== "available") {
      throw serviceError(
        "The selected transporter is not available.",
        "INVALID_OPERATION",
      );
    }
    if (!transporterCoversLocation(profile.coverage_areas, delivery.delivery_location)) {
      throw serviceError(
        "The selected transporter does not cover the delivery location.",
        "INVALID_OPERATION",
      );
    }

    const previousStatus = currentStatus;
    const previousTransporterId = delivery.transporter_id ?? null;

    await delivery.update(
      {
        transporter_id: transporterId,
        status: "assigned",
        assigned_at: new Date(),
        accepted_at: null,
      },
      { transaction },
    );

    await recordDeliveryEvent(
      delivery.id,
      reassign ? "reassigned" : "assigned",
      actorUserId,
      previousStatus,
      "assigned",
      reassign
        ? "Delivery reassigned to a new transporter."
        : "Delivery assigned to a transporter.",
      null,
      {
        transporter_id: transporterId,
        previous_transporter_id: previousTransporterId,
      },
      transaction,
    );
  });

  return buildDeliveryData(await loadDeliveryRow(deliveryId));
}

export async function acceptDelivery(
  userId: string,
  deliveryId: string,
): Promise<DeliveryData> {
  await sequelize.transaction(async (transaction) => {
    const delivery = await Delivery.findByPk(deliveryId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!delivery) {
      throw serviceError("Delivery not found.", "NOT_FOUND");
    }
    if (delivery.transporter_id !== userId) {
      throw serviceError(
        "Only the assigned transporter can accept this delivery.",
        "FORBIDDEN",
      );
    }
    if (delivery.status !== "assigned") {
      throw serviceError(
        `A delivery in ${delivery.status} status cannot be accepted.`,
        "INVALID_OPERATION",
      );
    }

    await delivery.update(
      {
        status: "accepted",
        accepted_at: new Date(),
      },
      { transaction },
    );

    await recordDeliveryEvent(
      delivery.id,
      "accepted",
      userId,
      "assigned",
      "accepted",
      "Transporter accepted the delivery.",
      null,
      null,
      transaction,
    );

    await syncOrderStatusForDelivery(
      delivery.order_id,
      "ready_for_delivery",
      userId,
      delivery.id,
      transaction,
    );
  });

  return buildDeliveryData(await loadDeliveryRow(deliveryId));
}

export async function declineDelivery(
  userId: string,
  deliveryId: string,
  input: DeclineDeliveryInput,
): Promise<DeliveryData> {
  await sequelize.transaction(async (transaction) => {
    const delivery = await Delivery.findByPk(deliveryId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!delivery) {
      throw serviceError("Delivery not found.", "NOT_FOUND");
    }
    if (delivery.transporter_id !== userId) {
      throw serviceError(
        "Only the assigned transporter can decline this delivery.",
        "FORBIDDEN",
      );
    }
    if (delivery.status !== "assigned") {
      throw serviceError(
        `A delivery in ${delivery.status} status cannot be declined.`,
        "INVALID_OPERATION",
      );
    }

    await delivery.update(
      {
        transporter_id: null,
        status: "pending",
        assigned_at: null,
        accepted_at: null,
      },
      { transaction },
    );

    await recordDeliveryEvent(
      delivery.id,
      "declined",
      userId,
      "assigned",
      "pending",
      input.reason
        ? `Transporter declined the delivery: ${input.reason}`
        : "Transporter declined the delivery.",
      null,
      input.reason ? { reason: input.reason } : null,
      transaction,
    );
  });

  return buildDeliveryData(await loadDeliveryRow(deliveryId));
}

interface StatusTransitionRule {
  from: DeliveryStatus[];
  actors: Array<"transporter" | "buyer" | "farmer" | "admin">;
}

const STATUS_TRANSITIONS: Record<
  Exclude<UpdateDeliveryStatusInput["status"], "cancelled">,
  StatusTransitionRule
> = {
  picked_up: { from: ["accepted"], actors: ["transporter"] },
  in_transit: { from: ["picked_up"], actors: ["transporter"] },
  delivered: { from: ["in_transit"], actors: ["transporter"] },
  completed: { from: ["delivered"], actors: ["buyer", "admin"] },
  failed: {
    from: ["accepted", "picked_up", "in_transit"],
    actors: ["transporter", "admin"],
  },
};

const CANCELLATION_FROM_ADMIN: DeliveryStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "picked_up",
  "in_transit",
];
const CANCELLATION_FROM_PARTICIPANT: DeliveryStatus[] = [
  "pending",
  "assigned",
  "accepted",
];

const ORDER_SYNC_TARGETS: Partial<
  Record<UpdateDeliveryStatusInput["status"], OrderStatus>
> = {
  in_transit: "in_transit",
  delivered: "delivered",
  completed: "completed",
};

export async function updateDeliveryStatus(
  userId: string,
  roles: string[],
  deliveryId: string,
  input: UpdateDeliveryStatusInput,
): Promise<DeliveryData> {
  await sequelize.transaction(async (transaction) => {
    const delivery = await Delivery.findByPk(deliveryId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!delivery) {
      throw serviceError("Delivery not found.", "NOT_FOUND");
    }

    const isAdmin = roles.includes("admin");
    const isTransporter = delivery.transporter_id === userId;
    const isBuyer = delivery.buyer_id === userId;
    const isFarmer = delivery.farmer_id === userId;

    if (!isAdmin && !isTransporter && !isBuyer && !isFarmer) {
      throw serviceError("Delivery not found.", "NOT_FOUND");
    }

    const previousStatus = (delivery.status ?? "pending") as DeliveryStatus;
    const targetStatus = input.status;

    if (targetStatus === "cancelled") {
      const allowedFrom = isAdmin
        ? CANCELLATION_FROM_ADMIN
        : CANCELLATION_FROM_PARTICIPANT;
      if (!allowedFrom.includes(previousStatus)) {
        throw serviceError(
          `A delivery in ${previousStatus} status cannot be cancelled.`,
          "INVALID_OPERATION",
        );
      }
      if (!isAdmin && !isBuyer && !isFarmer) {
        throw serviceError(
          "Only the buyer, farmer, or an administrator can cancel a delivery.",
          "FORBIDDEN",
        );
      }
    } else {
      const rule = STATUS_TRANSITIONS[targetStatus];
      if (!rule.from.includes(previousStatus)) {
        throw serviceError(
          `A delivery cannot move from ${previousStatus} to ${targetStatus}.`,
          "INVALID_OPERATION",
        );
      }
      const actorAllowed =
        (isAdmin && rule.actors.includes("admin")) ||
        (isTransporter && rule.actors.includes("transporter")) ||
        (isBuyer && rule.actors.includes("buyer")) ||
        (isFarmer && rule.actors.includes("farmer"));
      if (!actorAllowed) {
        throw serviceError(
          "You are not allowed to perform this delivery action.",
          "FORBIDDEN",
        );
      }
    }

    if (targetStatus === "failed") {
      const reason = input.reason?.trim();
      if (!reason) {
        throw serviceError(
          "A failure reason is required when marking a delivery failed.",
          "INVALID_OPERATION",
        );
      }
    }

    const now = new Date();
    const updates: Partial<InferAttributes<Delivery>> = {
      status: targetStatus,
    };
    if (targetStatus === "picked_up") updates.picked_up_at = now;
    if (targetStatus === "delivered") updates.delivered_at = now;
    if (targetStatus === "completed") updates.completed_at = now;
    if (targetStatus === "cancelled") {
      updates.cancelled_at = now;
      updates.cancellation_reason = input.reason?.trim() || null;
    }
    if (targetStatus === "failed") {
      updates.failed_at = now;
      updates.failure_reason = input.reason?.trim() ?? null;
    }

    await delivery.update(updates, { transaction });

    const action =
      targetStatus === "cancelled" ||
      targetStatus === "failed" ||
      targetStatus === "completed"
        ? targetStatus
        : "status_changed";
    const description =
      input.description?.trim() ||
      `Delivery status changed from ${previousStatus} to ${targetStatus}.`;

    await recordDeliveryEvent(
      delivery.id,
      action,
      userId,
      previousStatus,
      targetStatus,
      description,
      input.location?.trim() || null,
      input.reason ? { reason: input.reason.trim() } : null,
      transaction,
    );

    const orderSyncTarget = ORDER_SYNC_TARGETS[targetStatus];
    if (orderSyncTarget) {
      await syncOrderStatusForDelivery(
        delivery.order_id,
        orderSyncTarget,
        userId,
        delivery.id,
        transaction,
      );
    }
  });

  return buildDeliveryData(await loadDeliveryRow(deliveryId));
}
