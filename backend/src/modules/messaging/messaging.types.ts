export type ConversationStatus = "active" | "archived" | "blocked";
export type MessageType = "text";
export type MessageStatus = "sent" | "delivered" | "read";

export interface ConversationParticipantData {
  user_id: string;
  display_name: string | null;
  last_read_at: Date | null;
  joined_at: Date;
}

export interface ConversationListingSummary {
  id: string;
  title: string;
  status: string;
  farmer_user_id: string;
}

export interface ConversationBuyerRequestSummary {
  id: string;
  status: string;
  buyer_user_id: string;
}

export interface MessageSenderData {
  id: string;
  display_name: string | null;
}

export interface MessageData {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  content: string;
  message_type: MessageType;
  status: MessageStatus;
  delivered_at: Date | null;
  read_at: Date | null;
  sender?: MessageSenderData;
  created_at: Date;
  updated_at: Date;
}

export interface ConversationData {
  id: string;
  created_by_user_id: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  status: ConversationStatus;
  last_message_at: Date | null;
  participants: ConversationParticipantData[];
  listing?: ConversationListingSummary;
  buyer_request?: ConversationBuyerRequestSummary;
  last_message?: MessageData;
  unread_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedConversations {
  conversations: ConversationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedMessages {
  messages: MessageData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface UnreadCountData {
  total_unread: number;
  conversations: Array<{
    conversation_id: string;
    unread_count: number;
  }>;
}

export interface MarkReadResult {
  conversation_id: string;
  reader_user_id: string;
  read_at: Date;
  message_ids: string[];
  participant_user_ids: string[];
}

export interface MarkDeliveredResult {
  conversation_id: string;
  message_id: string;
  status: MessageStatus;
  delivered_at: Date | null;
  participant_user_ids: string[];
}

export interface SendMessageResult {
  message: MessageData;
  participant_user_ids: string[];
}

export interface ConversationAccess {
  conversation: import("../../database/models/conversation.model.js").Conversation;
  participantIds: string[];
  lastReadAt: Date | null;
}
