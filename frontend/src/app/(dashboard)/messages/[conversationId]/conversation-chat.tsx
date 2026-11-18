"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  callsApi,
  messagingApi,
  type ApiError,
  type CallData,
  type ConversationData,
  type MarkReadResult,
  type MessageData,
} from "@/lib/api";
import {
  formatCallDuration,
  getOtherParticipant,
  getParticipantRole,
  isValidConversationId,
  mergeMessages,
  participantName,
} from "@/lib/messaging";
import {
  joinConversationRoom,
  leaveConversationRoom,
  markDeliveredViaSocket,
  type ConversationUpdatedPayload,
  type MessageDeliveredPayload,
  type MessageNewPayload,
  type MessageReadPayload,
} from "@/lib/messaging-socket";
import { useMessaging } from "@/components/messaging/messaging-provider";
import { useCallManager } from "@/components/messaging/call-manager";
import { MessageComposer } from "@/components/messaging/message-composer";
import { MessageList } from "@/components/messaging/message-list";
import { ParticipantAvatar } from "@/components/messaging/participant-avatar";
import { PageHeader } from "@/components/dashboard/page-header";

interface ConversationChatProps {
  conversationId: string;
}

export default function ConversationChat({ conversationId }: ConversationChatProps) {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth();
  const { socket, connectionStatus, clearConversationUnread, refreshUnreadCount } =
    useMessaging();
  const { startCall } = useCallManager();

  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [olderError, setOlderError] = useState("");
  const [readError, setReadError] = useState("");
  const [unreadVisible, setUnreadVisible] = useState(false);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callError, setCallError] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<{ height: number; top: number } | null>(null);
  const scrollToBottomRef = useRef(true);

  const validId = isValidConversationId(conversationId);
  const activeConversationId = conversation?.id ?? "";

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const res = await messagingApi.markRead(token, id);
        const result: MarkReadResult = res.data;
        const ids = new Set(result.message_ids);
        setMessages((current) =>
          current.map((message) =>
            ids.has(message.id)
              ? { ...message, status: "read", read_at: result.read_at }
              : message,
          ),
        );
        clearConversationUnread(id);
        void refreshUnreadCount();
        setUnreadVisible(false);
        setReadError("");
      } catch (err) {
        setReadError(
          (err as ApiError).message || "Could not mark messages as read.",
        );
      }
    },
    [token, clearConversationUnread, refreshUnreadCount],
  );

  const loadCalls = useCallback(
    async (id: string) => {
      if (!token) return;
      setCallsLoading(true);
      try {
        const res = await callsApi.list(token, {
          conversation_id: id,
          page: 1,
          limit: 20,
        });
        setCalls(res.data.calls);
        setCallError("");
      } catch (err) {
        setCallError(
          (err as ApiError).message || "Could not load call history.",
        );
      } finally {
        setCallsLoading(false);
      }
    },
    [token],
  );

  const loadMessages = useCallback(
    async (id: string, pageNumber: number, append: boolean) => {
      if (!token) return;
      if (append) {
        const element = scrollRef.current;
        pendingScrollRef.current = {
          height: element?.scrollHeight ?? 0,
          top: element?.scrollTop ?? 0,
        };
        setLoadingOlder(true);
        setOlderError("");
      } else {
        scrollToBottomRef.current = true;
      }
      try {
        const res = await messagingApi.listMessages(token, id, {
          page: pageNumber,
          limit: 20,
          order: "desc",
        });
        setMessages((current) =>
          append
            ? mergeMessages(current, res.data.messages)
            : mergeMessages([], res.data.messages),
        );
        setPage(res.data.page);
        setTotalPages(res.data.total_pages);
      } catch (err) {
        const message =
          (err as ApiError).message || "Could not load messages.";
        if (append) setOlderError(message);
        else setLoadError(message);
      } finally {
        setLoadingOlder(false);
        setInitialLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token || !validId) return;
    let cancelled = false;

    async function loadConversation() {
      setInitialLoading(true);
      setLoadError("");
      try {
        const res = await messagingApi.getConversation(token!, conversationId);
        if (cancelled) return;
        setConversation(res.data.conversation);
        void markRead(conversationId);
        void loadCalls(conversationId);
        await loadMessages(conversationId, 1, false);
      } catch (err) {
        if (cancelled) return;
        const apiError = err as ApiError;
        setLoadError(
          apiError.status === 404
            ? "This conversation is unavailable or you do not have access."
            : apiError.message || "Could not load this conversation.",
        );
        setInitialLoading(false);
      }
    }

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [token, validId, conversationId, markRead, loadMessages, loadCalls]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const pending = pendingScrollRef.current;
    if (pending) {
      element.scrollTop =
        element.scrollHeight - pending.height + pending.top;
      pendingScrollRef.current = null;
      return;
    }
    if (scrollToBottomRef.current) {
      element.scrollTop = element.scrollHeight;
      scrollToBottomRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket || !user || !activeConversationId) return;
    const id = activeConversationId;
    const join = () =>
      joinConversationRoom(socket, id, (ack) => {
        if (!ack.success) {
          setReadError(
            ack.error?.message ||
              "Live updates are unavailable for this conversation.",
          );
        }
      });

    join();
    const onConnect = () => {
      join();
      void loadMessages(id, 1, false);
      void markRead(id);
      void loadCalls(id);
    };
    const onMessageNew = (payload: MessageNewPayload) => {
      const message = payload?.message;
      if (!message || message.conversation_id !== id) return;
      setMessages((current) => mergeMessages(current, [message]));
      if (message.sender_user_id === user.id) {
        scrollToBottomRef.current = true;
      } else {
        setUnreadVisible(true);
        markDeliveredViaSocket(socket, id, message.id);
      }
    };
    const onMessageRead = (payload: MessageReadPayload) => {
      if (payload?.conversation_id !== id) return;
      const ids = new Set(payload.message_ids ?? []);
      setMessages((current) =>
        current.map((message) =>
          ids.has(message.id) && message.sender_user_id === user.id
            ? { ...message, status: "read", read_at: payload.read_at }
            : message,
        ),
      );
    };
    const onMessageDelivered = (payload: MessageDeliveredPayload) => {
      if (payload?.conversation_id !== id) return;
      setMessages((current) =>
        current.map((message) =>
          message.id === payload.message_id &&
          message.sender_user_id === user.id &&
          message.status !== "read"
            ? {
                ...message,
                status: "delivered",
                delivered_at: payload.delivered_at,
              }
            : message,
        ),
      );
    };
    const onConversationUpdated = (payload: ConversationUpdatedPayload) => {
      if (payload?.conversation?.id !== id) return;
      setConversation(payload.conversation);
      if (payload.conversation.status !== "active") {
        setReadError("This conversation is no longer active.");
      }
    };

    const onCallEvent = (payload: { call?: CallData }) => {
      if (payload?.call?.conversation_id === id) void loadCalls(id);
    };

    socket.on("connect", onConnect);
    socket.on("message:new", onMessageNew);
    socket.on("message:read", onMessageRead);
    socket.on("message:delivered", onMessageDelivered);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("call:incoming", onCallEvent);
    socket.on("call:accepted", onCallEvent);
    socket.on("call:rejected", onCallEvent);
    socket.on("call:ended", onCallEvent);

    return () => {
      leaveConversationRoom(socket, id);
      socket.off("connect", onConnect);
      socket.off("message:new", onMessageNew);
      socket.off("message:read", onMessageRead);
      socket.off("message:delivered", onMessageDelivered);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("call:incoming", onCallEvent);
      socket.off("call:accepted", onCallEvent);
      socket.off("call:rejected", onCallEvent);
      socket.off("call:ended", onCallEvent);
    };
  }, [socket, user, activeConversationId, loadMessages, markRead, loadCalls]);

  const handleSendText = useCallback(
    async (content: string) => {
      if (!token || !conversation) {
        throw new Error("You must be signed in to send a message.");
      }
      const res = await messagingApi.sendMessage(
        token,
        conversation.id,
        content,
      );
      scrollToBottomRef.current = true;
      setMessages((current) => mergeMessages(current, [res.data.message]));
    },
    [token, conversation],
  );

  const handleSendFiles = useCallback(
    async (files: File[], content?: string) => {
      if (!token || !conversation) {
        throw new Error("You must be signed in to send a message.");
      }
      const res = await messagingApi.sendMessageWithAttachments(
        token,
        conversation.id,
        { content, files },
      );
      scrollToBottomRef.current = true;
      setMessages((current) => mergeMessages(current, [res.data.message]));
    },
    [token, conversation],
  );

  const getAttachmentBlob = useCallback(
    (downloadUrl: string) => {
      if (!token) return Promise.reject(new Error("Not authenticated."));
      return messagingApi.downloadAttachment(token, downloadUrl);
    },
    [token],
  );

  if (authLoading || (initialLoading && validId)) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-52 rounded-xl bg-deep-navy/10" />
        <div className="h-[65vh] rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  if (authError || !user || !token) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">
          {authError || "Sign in to view this conversation."}
        </p>
        <Link
          href={`/login?redirect=/messages/${conversationId}`}
          className="mt-4 inline-block text-sm font-semibold text-agro-green hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!validId || loadError || !conversation) {
    return (
      <div className="rounded-2xl border border-deep-navy/8 bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-lg font-bold text-deep-navy">
          Conversation unavailable
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-deep-navy/60">
          {!validId
            ? "This conversation link is invalid."
            : loadError ||
              "This conversation is unavailable or you do not have access."}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/messages"
            className="rounded-full bg-agro-green px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-deep-navy"
          >
            Back to messages
          </Link>
          {validId && !!loadError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs font-semibold text-agro-green hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const other = getOtherParticipant(conversation, user.id);
  const name = participantName(other);
  const role = getParticipantRole(conversation, other);
  const inactive = conversation.status !== "active";

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Messages", href: "/messages" }, { label: name }]}
        title={name}
        description={
          role
            ? `${role}${conversation.listing ? ` · ${conversation.listing.title}` : ""}`
            : conversation.listing
              ? conversation.listing.title
              : "AgroConnect conversation"
        }
        action={
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              connectionStatus === "connected"
                ? "bg-fresh-green/15 text-agro-green"
                : "bg-harvest-gold/12 text-amber-700"
            }`}
          >
            {connectionStatus === "connected" ? "Live" : "Reconnecting…"}
          </span>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-deep-navy/8 bg-white shadow-sm shadow-deep-navy/5">
        <div className="flex items-center gap-3 border-b border-deep-navy/8 px-4 py-3 sm:px-5">
          <Link
            href="/messages"
            aria-label="Back to messages"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-deep-navy/50 transition-colors hover:bg-soft-bg hover:text-agro-green lg:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </Link>
          <ParticipantAvatar name={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-deep-navy">{name}</p>
            <p className="truncate text-[11px] text-deep-navy/50">
              {role ? `${role} · ` : ""}
              {conversation.status === "active" ? "Active conversation" : conversation.status}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {other && !inactive && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void startCall({
                      conversationId: conversation.id,
                      calleeUserId: other.user_id,
                      callType: "audio",
                      peerName: name,
                    })
                  }
                  className="rounded-full border border-deep-navy/12 px-3 py-1.5 text-[11px] font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
                  aria-label="Start audio call"
                >
                  Audio call
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void startCall({
                      conversationId: conversation.id,
                      calleeUserId: other.user_id,
                      callType: "video",
                      peerName: name,
                    })
                  }
                  className="rounded-full border border-deep-navy/12 px-3 py-1.5 text-[11px] font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
                  aria-label="Start video call"
                >
                  Video call
                </button>
              </>
            )}
            {conversation.listing_id && (
              <Link
                href={`/marketplace/${conversation.listing_id}`}
                className="text-[11px] font-semibold text-agro-green hover:underline"
              >
                View listing
              </Link>
            )}
            {conversation.buyer_request_id && (
              <Link
                href={`/buyer-requests/${conversation.buyer_request_id}`}
                className="text-[11px] font-semibold text-agro-green hover:underline"
              >
                View request
              </Link>
            )}
          </div>
        </div>

        {(unreadVisible || readError || olderError || callError || inactive) && (
          <div className="space-y-2 border-b border-deep-navy/8 px-4 py-2 sm:px-5">
            {unreadVisible && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-fresh-green/8 px-3 py-2 text-xs text-agro-green">
                <span>New messages</span>
                <button
                  type="button"
                  onClick={() => void markRead(conversation.id)}
                  className="font-bold hover:underline"
                >
                  Mark as read
                </button>
              </div>
            )}
            {readError && (
              <p role="alert" className="text-xs text-amber-700">
                {readError}
              </p>
            )}
            {olderError && (
              <p role="alert" className="text-xs text-red-700">
                {olderError}
              </p>
            )}
            {callError && (
              <p role="alert" className="text-xs text-amber-700">
                {callError}
              </p>
            )}
            {inactive && (
              <p className="text-xs text-deep-navy/60">
                This conversation is {conversation.status}. Messaging is disabled.
              </p>
            )}
          </div>
        )}

        <div
          ref={scrollRef}
          className="h-[min(68vh,680px)] min-h-80 overflow-y-auto overscroll-contain bg-soft-bg/35"
          aria-label="Message history"
        >
          <MessageList
            messages={messages}
            currentUserId={user.id}
            hasOlder={page < totalPages}
            loadingOlder={loadingOlder}
            onLoadOlder={() => void loadMessages(conversation.id, page + 1, true)}
            getAttachmentBlob={getAttachmentBlob}
          />
        </div>

        <div className="border-t border-deep-navy/8">
          <div className="px-4 pt-3 sm:px-5">
            <details className="rounded-xl border border-deep-navy/8 bg-soft-bg/40 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-deep-navy/70">
                Call history {callsLoading ? "(loading…)" : `(${calls.length})`}
              </summary>
              <div className="mt-2 space-y-2 text-xs text-deep-navy/65">
                {calls.length === 0 && !callsLoading ? (
                  <p>No calls yet.</p>
                ) : (
                  calls.slice(0, 10).map((call) => {
                    const outgoing = call.caller_user_id === user.id;
                    const label =
                      call.status === "missed"
                        ? "Missed"
                        : call.status === "rejected"
                          ? "Declined"
                          : call.status === "cancelled"
                            ? "Cancelled"
                            : call.status === "failed"
                              ? "Failed"
                              : call.status === "ended"
                                ? "Ended"
                                : call.status;
                    return (
                      <div key={call.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                        <div>
                          <p className="font-medium text-deep-navy">
                            {outgoing ? "Outgoing" : "Incoming"} {call.call_type} call · {label}
                          </p>
                          <p className="text-[11px] text-deep-navy/45">
                            {new Date(call.initiated_at).toLocaleString()}
                          </p>
                        </div>
                        {call.duration_seconds ? (
                          <span className="text-[11px] font-semibold text-agro-green">
                            {formatCallDuration(call.duration_seconds)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </details>
          </div>
          <MessageComposer
            onSendText={handleSendText}
            onSendFiles={handleSendFiles}
            disabled={inactive}
          />
        </div>
      </div>
    </div>
  );
}
