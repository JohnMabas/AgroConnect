"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  messagingApi,
  type ApiError,
  type ConversationData,
  type ConversationStatus,
} from "@/lib/api";
import {
  getOtherParticipant,
  participantName,
} from "@/lib/messaging";
import type {
  ConversationCreatedPayload,
  MessageNewPayload,
} from "@/lib/messaging-socket";
import { useMessaging } from "@/components/messaging/messaging-provider";
import { ConversationListItem } from "@/components/messaging/conversation-list-item";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

type ContextFilter = "all" | "listing" | "request";

export default function MessagesPage() {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth();
  const {
    socket,
    connectionStatus,
    unreadByConversation,
    refreshUnreadCount,
  } = useMessaging();

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("active");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [contextFilter, setContextFilter] = useState<ContextFilter>("all");
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(
    async (pageNumber: number, append: boolean) => {
      if (!token) return;
      if (append) setLoadingMore(true);
      else setLoadingData(true);
      setLoadError("");
      try {
        const res = await messagingApi.listConversations(token, {
          status: statusFilter,
          page: pageNumber,
          limit: 20,
        });
        setConversations((current) =>
          append
            ? [...current, ...res.data.conversations]
            : res.data.conversations,
        );
        setPage(res.data.page);
        setTotalPages(res.data.total_pages);
        void refreshUnreadCount();
      } catch (err) {
        setLoadError(
          (err as ApiError).message || "Could not load conversations.",
        );
      } finally {
        setLoadingData(false);
        setLoadingMore(false);
      }
    },
    [token, statusFilter, refreshUnreadCount],
  );

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => void load(1, false), 0);
    return () => window.clearTimeout(timer);
  }, [token, load]);

  useEffect(() => {
    if (!socket || !user) return;

    const onMessageNew = (payload: MessageNewPayload) => {
      const message = payload?.message;
      if (!message) return;
      setConversations((current) => {
        const index = current.findIndex((item) => item.id === message.conversation_id);
        if (index < 0) return current;
        const updated: ConversationData = {
          ...current[index]!,
          last_message: message,
          last_message_at: message.created_at,
          updated_at: message.created_at,
        };
        return [updated, ...current.filter((item) => item.id !== message.conversation_id)];
      });
    };
    const onConversationCreated = (payload: ConversationCreatedPayload) => {
      if (
        payload?.conversation?.participants?.some(
          (participant) => participant.user_id === user.id,
        )
      ) {
        void load(1, false);
      }
    };
    const onConversationUpdated = () => {
      void load(1, false);
    };
    const onConnect = () => void load(1, false);

    socket.on("message:new", onMessageNew);
    socket.on("conversation:created", onConversationCreated);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("connect", onConnect);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("conversation:created", onConversationCreated);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("connect", onConnect);
    };
  }, [socket, user, load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const unread = unreadByConversation[conversation.id] ?? conversation.unread_count;
      if (unreadOnly && unread === 0) return false;
      if (contextFilter === "listing" && !conversation.listing_id) return false;
      if (contextFilter === "request" && !conversation.buyer_request_id) return false;
      if (!query) return true;
      const participant = getOtherParticipant(conversation, user?.id ?? "");
      const haystack = [
        participantName(participant),
        conversation.last_message?.content ?? "",
        conversation.listing?.title ?? "",
        "Buyer request",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [conversations, contextFilter, search, unreadByConversation, unreadOnly, user?.id]);

  if (authLoading || (loadingData && !user)) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
        <div className="h-12 rounded-xl bg-deep-navy/5" />
        <div className="space-y-2 rounded-2xl bg-white p-5">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-14 rounded-lg bg-deep-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">
          {authError || "Sign in to view your messages."}
        </p>
        <Link
          href="/login?redirect=/messages"
          className="mt-4 inline-block text-sm font-semibold text-agro-green hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const hasFilters = !!search.trim() || unreadOnly || contextFilter !== "all";

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Conversations with farmers and buyers on AgroConnect"
        action={
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              connectionStatus === "connected"
                ? "bg-fresh-green/15 text-agro-green"
                : "bg-harvest-gold/12 text-amber-700"
            }`}
          >
            {connectionStatus === "connected" ? "Live updates on" : "Reconnecting…"}
          </span>
        }
      />

      {connectionStatus === "error" && (
        <div className="mb-4 rounded-xl border border-harvest-gold/25 bg-harvest-gold/8 px-4 py-3 text-xs text-amber-800">
          Live updates are unavailable right now. Conversation history is still
          loaded from the server and will refresh when the connection returns.
        </div>
      )}

      <div className="rounded-2xl border border-deep-navy/8 bg-white shadow-sm shadow-deep-navy/5">
        <div className="space-y-3 border-b border-deep-navy/8 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search conversations</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-full border border-deep-navy/12 bg-soft-bg px-4 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 focus:border-agro-green focus:outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ConversationStatus | "all")
              }
              aria-label="Conversation status"
              className="rounded-full border border-deep-navy/12 bg-soft-bg px-4 py-2.5 text-sm text-deep-navy focus:border-agro-green focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="blocked">Blocked</option>
              <option value="all">All</option>
            </select>
            <select
              value={contextFilter}
              onChange={(event) => setContextFilter(event.target.value as ContextFilter)}
              aria-label="Conversation context"
              className="rounded-full border border-deep-navy/12 bg-soft-bg px-4 py-2.5 text-sm text-deep-navy focus:border-agro-green focus:outline-none"
            >
              <option value="all">All contexts</option>
              <option value="listing">Listing discussions</option>
              <option value="request">Buyer requests</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-deep-navy/65">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => setUnreadOnly(event.target.checked)}
                className="h-4 w-4 accent-agro-green"
              />
              Unread only
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setUnreadOnly(false);
                  setContextFilter("all");
                }}
                className="text-xs font-semibold text-agro-green hover:underline"
              >
                Clear filters
              </button>
            )}
            <span className="text-[11px] text-deep-navy/40">
              Search and filters apply to loaded conversations
            </span>
          </div>
        </div>

        {loadError ? (
          <div className="p-6 text-center">
            <p role="alert" className="text-sm text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => void load(1, false)}
              className="mt-3 rounded-full bg-agro-green px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-deep-navy"
            >
              Retry
            </button>
          </div>
        ) : loadingData ? (
          <div className="animate-pulse space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-deep-navy/8" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-deep-navy/8" />
                  <div className="h-3 w-2/3 rounded bg-deep-navy/5" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Open a produce listing or buyer request and contact the other party to start one."
            actionLabel="Browse marketplace"
            actionHref="/marketplace"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching conversations"
            description="Try a different search or clear the filters."
            actionLabel="Clear filters"
            onAction={() => {
              setSearch("");
              setUnreadOnly(false);
              setContextFilter("all");
            }}
          />
        ) : (
          <ul>
            {filtered.map((conversation) => (
              <li key={conversation.id}>
                <ConversationListItem
                  conversation={conversation}
                  currentUserId={user.id}
                  unreadCount={unreadByConversation[conversation.id] ?? conversation.unread_count}
                />
              </li>
            ))}
          </ul>
        )}

        {!loadingData && !loadError && page < totalPages && (
          <div className="border-t border-deep-navy/8 p-4 text-center">
            <button
              type="button"
              onClick={() => void load(page + 1, true)}
              disabled={loadingMore}
              className="rounded-full border border-deep-navy/15 px-5 py-2 text-xs font-semibold text-deep-navy/65 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more conversations"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
