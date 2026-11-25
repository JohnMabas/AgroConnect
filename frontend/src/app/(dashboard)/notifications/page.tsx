"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  notificationsApi,
  type ApiError,
  type NotificationData,
} from "@/lib/api";
import { mapNotificationActionUrl } from "@/lib/messaging";
import { useNotifications } from "@/components/notifications/notification-provider";
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

function notificationTypeLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NotificationsPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();
  const {
    unreadCount,
    version,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  } = useNotifications();

  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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
    } catch (err) {
      setError((err as ApiError).message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [token, tab, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, version]);

  async function handleMarkRead(id: string) {
    if (!token) return;
    setBusyId(id);
    setActionError("");
    try {
      await markNotificationRead(id);
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
    setMarkingAll(true);
    setActionError("");
    try {
      await markAllNotificationsRead();
      setPage(1);
      await load();
    } catch (err) {
      setActionError(
        (err as ApiError).message || "Failed to mark all notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  if (authLoading || (loading && notifications.length === 0)) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
        <div className="h-10 w-full rounded-xl bg-deep-navy/5" />
        <div className="space-y-3 rounded-2xl border border-deep-navy/8 bg-white p-5">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-12 rounded-lg bg-deep-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  if (authError || !token) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
      >
        <p className="text-sm text-red-700">
          {authError || "You must be signed in to view notifications."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Real updates about your offers, orders, deliveries and account."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/settings/notifications"
              className="rounded-full border border-deep-navy/15 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
            >
              Preferences
            </Link>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={markingAll}
                onClick={() => void handleMarkAllRead()}
                className="rounded-full bg-agro-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
              >
                {markingAll ? "Marking…" : "Mark all read"}
              </button>
            ) : null}
          </div>
        }
      />

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold hover:bg-white"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm"
          role="tablist"
          aria-label="Notification filters"
        >
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
        {notifications.length === 0 && !loading ? (
          <EmptyState
            title={tab === "unread" ? "No unread notifications" : "No notifications yet"}
            description={
              tab === "unread"
                ? "You're all caught up. New activity will appear here."
                : "Activity on your offers, orders and deliveries will appear here."
            }
          />
        ) : (
          <ul className="divide-y divide-deep-navy/5">
            {notifications.map((notification) => {
              const href = mapNotificationActionUrl(notification.action_url);
              const title = href ? (
                <Link
                  href={href}
                  className="text-sm font-semibold text-deep-navy transition-colors hover:text-agro-green hover:underline"
                  onClick={() => {
                    if (!notification.is_read) void handleMarkRead(notification.id);
                  }}
                >
                  {notification.title}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-deep-navy">
                  {notification.title}
                </p>
              );

              return (
                <li
                  key={notification.id}
                  className={`flex items-start gap-3 px-5 py-4 ${
                    notification.is_read ? "" : "bg-agro-green/[0.025]"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notification.is_read
                        ? "bg-deep-navy/20"
                        : "bg-agro-green"
                    }`}
                    aria-label={notification.is_read ? "read" : "unread"}
                  />
                  <div className="min-w-0 flex-1">
                    {title}
                    <p className="mt-1 text-sm leading-relaxed text-deep-navy/60">
                      {notification.message}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-deep-navy/40">
                      <time dateTime={notification.created_at}>
                        {formatDateTime(notification.created_at)}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>
                        {notificationTypeLabel(notification.notification_type)}
                      </span>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      disabled={busyId === notification.id}
                      onClick={() => void handleMarkRead(notification.id)}
                      className="shrink-0 rounded-full border border-deep-navy/15 px-3 py-1.5 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === notification.id ? "Saving…" : "Mark read"}
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
