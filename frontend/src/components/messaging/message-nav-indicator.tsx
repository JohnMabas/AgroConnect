"use client";

import Link from "next/link";
import { useMessaging } from "@/components/messaging/messaging-provider";

export function MessageNavIndicator() {
  const { unreadTotal } = useMessaging();
  const label =
    unreadTotal > 0
      ? `Messages, ${unreadTotal} unread`
      : "Messages";

  return (
    <Link
      href="/messages"
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep-navy/12 text-deep-navy/65 transition-colors hover:border-agro-green/30 hover:text-agro-green"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M3 4a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2H3zm0 2h14l-7 5-7-5z" />
      </svg>
      {unreadTotal > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-agro-green px-1 text-[10px] font-bold leading-4 text-white">
          {unreadTotal > 99 ? "99+" : unreadTotal}
        </span>
      )}
    </Link>
  );
}
