import type { Transaction } from "sequelize";
import {
  Conversation,
  ConversationParticipant,
  Message,
  User,
} from "../../database/models/index.js";
import type {
  ConversationAccess,
  MessageData,
  MessageStatus,
  MessageType,
} from "./messaging.types.js";

export function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

type MessageRow = Message & { sender?: User };

export function buildMessageData(row: MessageRow): MessageData {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_user_id: row.sender_user_id,
    content: row.content,
    message_type: (row.message_type ?? "text") as MessageType,
    status: (row.status ?? "sent") as MessageStatus,
    delivered_at: row.delivered_at ?? null,
    read_at: row.read_at ?? null,
    sender: row.sender
      ? {
          id: row.sender.id,
          display_name: row.sender.display_name ?? null,
        }
      : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

export async function getParticipantUserIds(
  conversationId: string,
  transaction?: Transaction,
): Promise<string[]> {
  const records = await ConversationParticipant.findAll({
    where: { conversation_id: conversationId },
    attributes: ["user_id"],
    transaction,
  });
  return records.map((record) => record.user_id);
}

/**
 * Resolve a conversation only when the supplied user is a participant.
 *
 * Missing conversations and conversations the user does not belong to both
 * return NOT_FOUND to avoid leaking the existence of private conversations.
 */
export async function assertConversationParticipant(
  conversationId: string,
  userId: string,
  transaction?: Transaction,
): Promise<ConversationAccess> {
  const participation = await ConversationParticipant.findOne({
    where: { conversation_id: conversationId, user_id: userId },
    include: [{ model: Conversation, as: "conversation" }],
    transaction,
  });

  const conversation = (
    participation as (ConversationParticipant & {
      conversation?: Conversation;
    }) | null
  )?.conversation;

  if (!participation || !conversation) {
    throw serviceError("Conversation not found.", "NOT_FOUND");
  }

  const participantIds = await getParticipantUserIds(
    conversationId,
    transaction,
  );

  return {
    conversation,
    participantIds,
    lastReadAt: participation.last_read_at ?? null,
  };
}
