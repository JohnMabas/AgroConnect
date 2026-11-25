"use client";

import Link from "next/link";
import { useNotifications } from "@/components/notifications/notification-provider";

export function NotificationNavIndicator() {
  const { unreadCount } = useNotifications();
  const label =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-navy/12 text-deep-navy/65 transition-colors hover:border-harvest-gold/40 hover:text-amber-700"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
        <path d="M7.17 17a3 3 0 005.66 0H7.17z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-harvest-gold px-1 text-[10px] font-bold leading-4 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
