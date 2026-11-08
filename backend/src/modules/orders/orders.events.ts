import { EventEmitter } from "node:events";
import type { Transaction } from "sequelize";
import { OrderEvent } from "../../database/models/index.js";
import { emitToUser } from "../../realtime/registry.js";
import type { OrderData, OrderEventData } from "./orders.types.js";

export interface OrderUpdatedEvent {
  order: OrderData;
  action: string;
  actor_user_id: string | null;
}

export interface OrderExpiredEvent {
  order_id: string;
  reason: string;
}

export const orderEventBus = new EventEmitter();

export function publishOrderExpired(
  orderId: string,
  reason = "reservation_expired",
): void {
  orderEventBus.emit("order.expired", {
    order_id: orderId,
    reason,
  } satisfies OrderExpiredEvent);
}

export async function recordOrderEvent(
  orderId: string,
  action: string,
  actorUserId: string | null,
  previousStatus: string | null,
  newStatus: string | null,
  metadata: Record<string, unknown> | null,
  transaction: Transaction,
): Promise<OrderEvent> {
  return OrderEvent.create(
    {
      order_id: orderId,
      actor_user_id: actorUserId,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      metadata,
    },
    { transaction },
  );
}

export function buildOrderEventData(row: OrderEvent): OrderEventData {
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

export function publishOrderUpdated(
  order: OrderData,
  action: string,
  actorUserId: string | null,
): void {
  orderEventBus.emit("order.updated", {
    order,
    action,
    actor_user_id: actorUserId,
  } satisfies OrderUpdatedEvent);

  const participantUserIds = [order.buyer_id, order.farmer_id];
  for (const participantUserId of participantUserIds) {
    emitToUser(participantUserId, "order:updated", {
      action,
      order,
      actor_user_id: actorUserId,
    });
    emitToUser(participantUserId, `order:${action}`, {
      order,
      actor_user_id: actorUserId,
    });
  }
}
