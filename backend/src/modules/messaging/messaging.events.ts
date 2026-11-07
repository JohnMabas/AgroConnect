import { EventEmitter } from "node:events";
import type { MessageData } from "./messaging.types.js";

export interface MessageCreatedEvent {
  conversation_id: string;
  message: MessageData;
  participant_user_ids: string[];
}

/**
 * In-process messaging event bus for future notification integration.
 *
 * Phase 11 (notifications) can subscribe to `message.created` without changing
 * the messaging module. This intentionally uses Node's EventEmitter rather than
 * Redis or another broker because AgroConnect runs as a single backend service.
 */
export const messagingEventBus = new EventEmitter();

export function publishMessageCreated(event: MessageCreatedEvent): void {
  messagingEventBus.emit("message.created", event);
}
