import { EventEmitter } from "node:events";
import { emitToUser } from "../../realtime/registry.js";
import type {
  DeliveryData,
  DeliveryLocationData,
} from "./deliveries.types.js";

export interface DeliveryLocationUpdatedEvent {
  delivery: DeliveryData;
  location: DeliveryLocationData;
  actor_user_id: string | null;
}

export interface DeliveryUpdatedEvent {
  delivery: DeliveryData;
  action: string;
  actor_user_id: string | null;
}

export const deliveryEventBus = new EventEmitter();

export function publishDeliveryUpdated(
  delivery: DeliveryData,
  action: string,
  actorUserId: string | null,
): void {
  deliveryEventBus.emit("delivery.updated", {
    delivery,
    action,
    actor_user_id: actorUserId,
  } satisfies DeliveryUpdatedEvent);

  const recipientIds = new Set<string>([
    delivery.buyer_id,
    delivery.farmer_id,
    delivery.created_by_user_id ?? delivery.buyer_id,
  ]);
  if (delivery.transporter_id) {
    recipientIds.add(delivery.transporter_id);
  }
  if (actorUserId) {
    recipientIds.add(actorUserId);
  }

  for (const recipientId of recipientIds) {
    emitToUser(recipientId, "delivery:updated", {
      action,
      delivery,
      actor_user_id: actorUserId,
    });
    emitToUser(recipientId, `delivery:${action}`, {
      delivery,
      actor_user_id: actorUserId,
    });
  }
}

export function publishDeliveryLocationUpdated(
  delivery: DeliveryData,
  location: DeliveryLocationData,
  actorUserId: string | null,
): void {
  const event: DeliveryLocationUpdatedEvent = {
    delivery,
    location,
    actor_user_id: actorUserId,
  };

  const recipientIds = new Set([
    delivery.buyer_id,
    delivery.farmer_id,
    delivery.created_by_user_id ?? delivery.buyer_id,
  ]);
  if (delivery.transporter_id) {
    recipientIds.add(delivery.transporter_id);
  }
  if (actorUserId) {
    recipientIds.add(actorUserId);
  }

  for (const recipientId of recipientIds) {
    emitToUser(recipientId, "delivery:location:updated", event);
  }
}
