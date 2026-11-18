import Link from "next/link";
import type { ConversationData } from "@/lib/api";
import {
  formatConversationTime,
  getOtherParticipant,
  getParticipantRole,
  messagePreviewText,
  participantName,
} from "@/lib/messaging";
import { ParticipantAvatar } from "@/components/messaging/participant-avatar";

interface ConversationListItemProps {
  conversation: ConversationData;
  currentUserId: string;
  unreadCount?: number;
}

export function ConversationListItem({
  conversation,
  currentUserId,
  unreadCount,
}: ConversationListItemProps) {
  const participant = getOtherParticipant(conversation, currentUserId);
  const name = participantName(participant);
  const role = getParticipantRole(conversation, participant);
  const unread = unreadCount ?? conversation.unread_count;
  const previewText = messagePreviewText(conversation.last_message);
  const preview = conversation.last_message
    ? `${conversation.last_message.sender_user_id === currentUserId ? "You: " : ""}${previewText}`
    : previewText;
  const time = formatConversationTime(
    conversation.last_message?.created_at ?? conversation.updated_at,
  );

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="flex items-start gap-3 border-b border-deep-navy/5 px-4 py-4 transition-colors last:border-b-0 hover:bg-soft-bg sm:px-5"
      aria-label={`Open conversation with ${name}`}
    >
      <ParticipantAvatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-heading text-sm font-bold text-deep-navy">{name}</p>
              {role && (
                <span className="rounded-full bg-deep-navy/5 px-2 py-0.5 text-[10px] font-semibold text-deep-navy/55">
                  {role}
                </span>
              )}
              {conversation.status !== "active" && (
                <span className="rounded-full bg-harvest-gold/12 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {conversation.status}
                </span>
              )}
            </div>
            {(conversation.listing || conversation.buyer_request) && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-agro-green/80">
                {conversation.listing
                  ? `Listing · ${conversation.listing.title}`
                  : `Buyer request · ${conversation.buyer_request?.status ?? "request"}`}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {time && <time className="text-[11px] text-deep-navy/40">{time}</time>}
            {unread > 0 && (
              <span
                className="flex min-w-5 items-center justify-center rounded-full bg-agro-green px-1.5 py-0.5 text-[10px] font-bold text-white"
                aria-label={`${unread} unread messages`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
        <p className="mt-1 truncate text-xs text-deep-navy/55">{preview}</p>
      </div>
    </Link>
  );
}
