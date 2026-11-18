import {
  ApiError,
  messagingApi,
  type ConversationData,
  type ConversationParticipantData,
  type MessageData,
} from "@/lib/api";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidConversationId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function mapNotificationActionUrl(
  url: string | null | undefined,
): string | null {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return null;
  return url.startsWith("/conversations/")
    ? url.replace(/^\/conversations\//, "/messages/")
    : url;
}

export function getOtherParticipant(
  conversation: ConversationData,
  currentUserId: string,
): ConversationParticipantData | null {
  return (
    conversation.participants.find(
      (participant) => participant.user_id !== currentUserId,
    ) ?? null
  );
}

export function getParticipantRole(
  conversation: ConversationData,
  participant: ConversationParticipantData | null,
): "Farmer" | "Buyer" | null {
  if (!participant) return null;
  if (conversation.listing?.farmer_user_id === participant.user_id) return "Farmer";
  if (conversation.buyer_request?.buyer_user_id === participant.user_id) return "Buyer";
  return null;
}

export function participantName(
  participant: ConversationParticipantData | null,
): string {
  return participant?.display_name ?? "AgroConnect user";
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

export function mergeMessages(
  existing: MessageData[],
  incoming: MessageData[],
): MessageData[] {
  const byId = new Map<string, MessageData>();
  for (const message of [...existing, ...incoming]) {
    const current = byId.get(message.id);
    if (!current || message.updated_at >= current.updated_at) {
      byId.set(message.id, message);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const byDate = a.created_at.localeCompare(b.created_at);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}

export function messagePreviewText(message: MessageData | undefined | null): string {
  if (!message) return "No messages yet — start the conversation.";
  const content = (message.content ?? "").trim();
  if (content) return content;
  const attachments = message.attachments ?? [];
  if (attachments.some((a) => a.attachment_type === "image") && attachments.some((a) => a.attachment_type === "audio")) {
    return "Sent attachments";
  }
  if (attachments.some((a) => a.attachment_type === "image")) {
    return attachments.length > 1 ? "Sent images" : "Sent an image";
  }
  if (attachments.some((a) => a.attachment_type === "audio")) {
    return attachments.length > 1 ? "Sent voice messages" : "Sent a voice message";
  }
  if (attachments.length > 0) return "Sent an attachment";
  return "Sent a message";
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDurationSeconds(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--:--";
  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatCallDuration(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}


export function formatMessageTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function formatConversationTime(value: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return new Intl.DateTimeFormat("en-NG", {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    }
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

export function formatDateSeparator(value: string): string {
  try {
    const date = new Date(value);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === now.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
    }).format(date);
  } catch {
    return value;
  }
}

function isDuplicateConversationError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 409 &&
    /already exists/i.test(err.message)
  );
}

/**
 * Create a conversation for a listing or buyer request context. The backend
 * rejects duplicates with 409, so resolve the existing conversation through
 * the real conversation list instead of creating another one.
 */
export async function resolveConversationForContext(
  token: string,
  payload: {
    participant_user_id: string;
    listing_id?: string | null;
    buyer_request_id?: string | null;
  },
): Promise<string> {
  try {
    const created = await messagingApi.createConversation(token, payload);
    return created.data.conversation.id;
  } catch (err) {
    if (!isDuplicateConversationError(err)) throw err;
  }

  const maxPages = 10;
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await messagingApi.listConversations(token, {
      status: "all",
      page,
      limit: 50,
    });
    const match = result.data.conversations.find(
      (conversation) =>
        conversation.participants.some(
          (participant) => participant.user_id === payload.participant_user_id,
        ) &&
        (conversation.listing_id ?? null) === (payload.listing_id ?? null) &&
        (conversation.buyer_request_id ?? null) === (payload.buyer_request_id ?? null),
    );
    if (match) {
      if (match.status === "archived") {
        const reopened = await messagingApi.unarchiveConversation(token, match.id);
        return reopened.data.conversation.id;
      }
      return match.id;
    }
    if (page >= result.data.total_pages) break;
  }

  throw new Error("We could not find an existing conversation. Please try again.");
}
