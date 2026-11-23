"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  notificationsApi,
  type ApiError,
  type NotificationData,
} from "@/lib/api";
import { mapNotificationActionUrl } from "@/lib/messaging";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination } from "@/components/ui";

type Tab = "all" | "unread";

const PAGE_LIMIT = 10;

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function NotificationsPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await notificationsApi.getNotifications(token, {
        unread: tab === "unread",
        page,
        limit: PAGE_LIMIT,
      });
      setNotifications(res.data.notifications);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [token, tab, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkRead(id: string) {
    if (!token) return;
    setBusyId(id);
    setActionError("");
    try {
      await notificationsApi.markRead(token, id);
      await load();
    } catch (err) {
      setActionError(
        (err as ApiError).message || "Failed to mark notification as read.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    if (!token) return;
    setMarkingAll(true);
    setActionError("");
    try {
      await notificationsApi.markAllRead(token);
      setUnreadCount(0);
      if (page === 1) {
        await load();
      } else {
        setPage(1);
      }
    } catch (err) {
      setActionError(
        (err as ApiError).message || "Failed to mark all notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
        <div className="h-10 w-full rounded-xl bg-deep-navy/5" />
        <div className="space-y-3 rounded-2xl border border-deep-navy/8 bg-white p-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-deep-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  if (authError || !token) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">
          {authError || "You must be signed in to view notifications."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-full border border-agro-green/30 px-5 py-2 text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about your listings, requests, offers and orders."
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              disabled={markingAll}
              onClick={() => void handleMarkAllRead()}
              className="rounded-full border border-agro-green/30 px-4 py-2 text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingAll ? "Marking…" : "Mark all read"}
            </button>
          ) : null
        }
      />

      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Notification filters">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                setPage(1);
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                tab === value
                  ? "bg-agro-green text-white shadow-sm"
                  : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"
              }`}
            >
              {value}
              {value === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>
        <p className="text-sm text-deep-navy/50">
          {total.toLocaleString()} notification{total !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep-navy/8 bg-white shadow-sm">
        {notifications.length === 0 ? (
          <EmptyState
            title={tab === "unread" ? "No unread notifications" : "No notifications yet"}
            description={
              tab === "unread"
                ? "You're all caught up. New activity will appear here."
                : "Activity on your listings, requests and offers will appear here."
            }
          />
        ) : (
          <ul className="divide-y divide-deep-navy/5">
            {notifications.map((n) => {
              const href = mapNotificationActionUrl(n.action_url);
              return (
                <li key={n.id} className="flex items-start gap-3 px-5 py-4">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.is_read ? "bg-deep-navy/20" : "bg-agro-green"
                    }`}
                    aria-label={n.is_read ? "read" : "unread"}
                  />
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link
                        href={href}
                        className="text-sm font-semibold text-deep-navy transition-colors hover:text-agro-green hover:underline"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-deep-navy">{n.title}</p>
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-deep-navy/60">{n.message}</p>
                    <time dateTime={n.created_at} className="mt-1 block text-xs text-deep-navy/40">
                      {formatDateTime(n.created_at)}
                    </time>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      disabled={busyId === n.id}
                      onClick={() => void handleMarkRead(n.id)}
                      className="shrink-0 rounded-full border border-deep-navy/15 px-3 py-1.5 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === n.id ? "Saving…" : "Mark read"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
