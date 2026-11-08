import type { OfferNotificationEvent } from "../offers/offers.events.js";
import { offerEventBus } from "../offers/offers.events.js";
import type { MessageCreatedEvent } from "../messaging/messaging.events.js";
import { messagingEventBus } from "../messaging/messaging.events.js";
import type {
  OrderExpiredEvent,
  OrderUpdatedEvent,
} from "../orders/orders.events.js";
import { orderEventBus } from "../orders/orders.events.js";
import type { DeliveryUpdatedEvent } from "../deliveries/deliveries.events.js";
import { deliveryEventBus } from "../deliveries/deliveries.events.js";
import { getOrderDataById } from "../orders/orders.service.js";
import { dispatchNotification } from "./notifications.service.js";
import type { NotificationType } from "./notifications.types.js";

let initialized = false;

function safeRun(handler: () => Promise<void>): void {
  void handler().catch((error: unknown) => {
    console.error("Notification event handler failed:", error);
  });
}

const OFFER_TYPE_BY_ACTION: Record<string, NotificationType> = {
  created: "new_offer",
  countered: "counter_offer_received",
  accepted: "offer_accepted",
  rejected: "offer_rejected",
  withdrawn: "offer_withdrawn",
  expired: "offer_expired",
};

async function handleOfferEvent(event: OfferNotificationEvent): Promise<void> {
  if (
    event.action === "created" &&
    event.offer.parent_offer_id !== null &&
    event.offer.parent_offer_id !== undefined
  ) {
    return;
  }

  const notificationType = OFFER_TYPE_BY_ACTION[event.action];
  if (!notificationType) {
    return;
  }

  const actorName =
    event.actor_user_id === event.offer.buyer_id
      ? event.offer.buyer?.display_name
      : event.actor_user_id === event.offer.farmer_id
        ? event.offer.farmer?.display_name
        : null;

  for (const recipientId of new Set(event.participant_user_ids)) {
    if (event.actor_user_id !== null && recipientId === event.actor_user_id) {
      continue;
    }
    await dispatchNotification({
      user_id: recipientId,
      notification_type: notificationType,
      variables: {
        actor_name: actorName,
        offer_number: event.offer.offer_number,
        amount: event.offer.total_amount,
        currency: event.offer.currency,
        quantity: event.offer.quantity,
        unit: event.offer.unit,
      },
      related_entity_type: "offer",
      related_entity_id: event.offer.id,
      action_url: `/offers/${event.offer.id}`,
      dedupe_key: `offer:${event.action}:${event.offer.id}:${recipientId}`,
    });
  }
}

async function handleMessageCreated(
  event: MessageCreatedEvent,
): Promise<void> {
  const senderName = event.message.sender?.display_name ?? null;

  for (const recipientId of new Set(event.participant_user_ids)) {
    if (recipientId === event.message.sender_user_id) {
      continue;
    }
    await dispatchNotification({
      user_id: recipientId,
      notification_type: "new_message",
      variables: {
        actor_name: senderName,
        message: event.message.content.slice(0, 200),
      },
      related_entity_type: "conversation",
      related_entity_id: event.conversation_id,
      action_url: `/conversations/${event.conversation_id}`,
      dedupe_key: `message:${event.message.id}:${recipientId}`,
      allow_external: false,
    });
  }
}

function orderRecipients(event: OrderUpdatedEvent): string[] {
  const { order, action, actor_user_id: actorId } = event;
  if (
    action === "payment_confirmed" ||
    action === "payment_failed" ||
    action === "refund_updated"
  ) {
    return [order.buyer_id, order.farmer_id];
  }
  return [order.buyer_id, order.farmer_id].filter(
    (recipientId) => recipientId !== actorId,
  );
}

function orderNotificationType(
  event: OrderUpdatedEvent,
): NotificationType | null {
  switch (event.action) {
    case "created":
      return "order_created";
    case "cancelled":
      return "order_cancelled";
    case "payment_confirmed":
      return "payment_successful";
    case "payment_failed":
      return "payment_failed";
    case "refund_updated":
      return event.order.refunded_at ? "refund_confirmed" : null;
    case "reservation_expired":
      return "reservation_expired";
    default:
      return null;
  }
}

async function handleOrderUpdated(event: OrderUpdatedEvent): Promise<void> {
  const notificationType = orderNotificationType(event);
  if (!notificationType) {
    return;
  }

  const actorName =
    event.actor_user_id === event.order.buyer_id
      ? event.order.buyer?.display_name
      : event.actor_user_id === event.order.farmer_id
        ? event.order.farmer?.display_name
        : null;

  for (const recipientId of orderRecipients(event)) {
    await dispatchNotification({
      user_id: recipientId,
      notification_type: notificationType,
      variables: {
        actor_name: actorName,
        order_number: event.order.order_number,
        amount: event.order.total_amount,
        currency: event.order.currency,
        quantity: event.order.quantity,
        unit: event.order.unit,
        reason: event.order.cancellation_reason,
      },
      related_entity_type: "order",
      related_entity_id: event.order.id,
      action_url: `/orders/${event.order.id}`,
      dedupe_key: `order:${event.action}:${event.order.id}:${recipientId}`,
    });
  }
}

async function handleOrderExpired(event: OrderExpiredEvent): Promise<void> {
  const order = await getOrderDataById(event.order_id);
  await dispatchNotification({
    user_id: order.buyer_id,
    notification_type: "reservation_expired",
    variables: {
      order_number: order.order_number,
      amount: order.total_amount,
      currency: order.currency,
    },
    related_entity_type: "order",
    related_entity_id: order.id,
    action_url: `/orders/${order.id}`,
    dedupe_key: `order:${event.reason}:${order.id}:${order.buyer_id}`,
  });
}

const DELIVERY_TYPE_BY_ACTION: Record<string, NotificationType> = {
  created: "delivery_assigned",
  assigned: "delivery_assigned",
  reassigned: "delivery_assigned",
  accepted: "delivery_accepted",
  declined: "delivery_declined",
  picked_up: "delivery_picked_up",
  in_transit: "delivery_in_transit",
  delivered: "delivery_delivered",
  completed: "delivery_completed",
  failed: "delivery_failed",
  cancelled: "delivery_cancelled",
};

async function handleDeliveryUpdated(
  event: DeliveryUpdatedEvent,
): Promise<void> {
  const notificationType = DELIVERY_TYPE_BY_ACTION[event.action];
  if (!notificationType) {
    return;
  }

  const actorName =
    event.actor_user_id === event.delivery.transporter_id
      ? event.delivery.transporter?.display_name
      : event.actor_user_id === event.delivery.buyer_id
        ? event.delivery.buyer?.display_name
        : event.actor_user_id === event.delivery.farmer_id
          ? event.delivery.farmer?.display_name
          : null;

  const recipients = new Set<string>([
    event.delivery.buyer_id,
    event.delivery.farmer_id,
    event.delivery.created_by_user_id ?? event.delivery.buyer_id,
  ]);
  if (event.delivery.transporter_id) {
    recipients.add(event.delivery.transporter_id);
  }

  for (const recipientId of recipients) {
    if (
      event.actor_user_id !== null &&
      recipientId === event.actor_user_id
    ) {
      continue;
    }
    await dispatchNotification({
      user_id: recipientId,
      notification_type: notificationType,
      variables: {
        actor_name: actorName,
        delivery_reference: event.delivery.delivery_reference,
        order_number: event.delivery.order?.order_number,
        amount: event.delivery.delivery_fee,
        currency: event.delivery.currency,
        reason:
          event.delivery.failure_reason ??
          event.delivery.cancellation_reason,
      },
      related_entity_type: "delivery",
      related_entity_id: event.delivery.id,
      action_url: `/deliveries/${event.delivery.id}`,
      dedupe_key: `delivery:${event.action}:${event.delivery.id}:${recipientId}`,
    });
  }
}

export function initializeNotificationEvents(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  offerEventBus.on("offer.updated", (event: OfferNotificationEvent) => {
    safeRun(() => handleOfferEvent(event));
  });
  messagingEventBus.on("message.created", (event: MessageCreatedEvent) => {
    safeRun(() => handleMessageCreated(event));
  });
  orderEventBus.on("order.updated", (event: OrderUpdatedEvent) => {
    safeRun(() => handleOrderUpdated(event));
  });
  orderEventBus.on("order.expired", (event: OrderExpiredEvent) => {
    safeRun(() => handleOrderExpired(event));
  });
  deliveryEventBus.on("delivery.updated", (event: DeliveryUpdatedEvent) => {
    safeRun(() => handleDeliveryUpdated(event));
  });
}
