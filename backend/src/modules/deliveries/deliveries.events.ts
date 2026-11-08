import { emitToUser } from "../../realtime/registry.js";
import type { DeliveryData } from "./deliveries.types.js";

export function publishDeliveryUpdated(
  delivery: DeliveryData,
  action: string,
  actorUserId: string | null,
): void {
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
