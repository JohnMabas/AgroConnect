import { EventEmitter } from "node:events";
import type { OfferData } from "./offers.types.js";

export type OfferEventAction =
  | "created"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface OfferNotificationEvent {
  action: OfferEventAction;
  offer: OfferData;
  actor_user_id: string | null;
  participant_user_ids: string[];
}

export const offerEventBus = new EventEmitter();

export function publishOfferEvent(event: OfferNotificationEvent): void {
  offerEventBus.emit("offer.updated", event);
  offerEventBus.emit(`offer.${event.action}`, event);
}
