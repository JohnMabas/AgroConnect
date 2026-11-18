"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  profileApi,
  buyerRequestsApi,
  notificationsApi,
  type UserProfileData,
  type NotificationData,
} from "@/lib/api";
import { mapNotificationActionUrl } from "@/lib/messaging";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProfileCompletion } from "@/components/dashboard/profile-completion";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

interface BuyerStats {
  activeRequests: number | null;
  fulfilledRequests: number | null;
  cancelledRequests: number | null;
}

export default function BuyerDashboardPage() {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth("buyer");

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<BuyerStats>({
    activeRequests: null,
    fulfilledRequests: null,
    cancelledRequests: null,
  });
  const [notifications, setNotifications] = useState<NotificationData[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        const [profileRes, requestsRes, notifRes] = await Promise.allSettled([
          profileApi.getMe(token!),
          buyerRequestsApi.getMyRequests(token!, { limit: 100 }),
          notificationsApi.getNotifications(token!, { limit: 5 }),
        ]);

        if (profileRes.status === "fulfilled") {
          setProfile(profileRes.value.data.profile);
        }

        if (requestsRes.status === "fulfilled") {
          const requests = requestsRes.value.data.requests;
          setStats({
            activeRequests: requests.filter(
              (r) => r.status === "open" || r.status === "paused",
            ).length,
            fulfilledRequests: requests.filter((r) => r.status === "fulfilled").length,
            cancelledRequests: requests.filter(
              (r) => r.status === "cancelled" || r.status === "expired",
            ).length,
          });
        } else {
          setStats({ activeRequests: 0, fulfilledRequests: 0, cancelledRequests: 0 });
        }

        if (notifRes.status === "fulfilled") {
          setNotifications(notifRes.value.data.notifications);
        } else {
          setNotifications([]);
        }
      } finally {
        setDataLoading(false);
      }
    }

    void load();
  }, [token]);

  if (authLoading || dataLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;
  if (!user) return null;

  const displayName =
    profile?.display_name ??
    (profile?.first_name
      ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
      : null) ??
    user.display_name ??
    user.email ??
    user.phone_number ??
    "Buyer";

  const completionItems = [
    { label: "Phone verified", done: user.phone_verified },
    { label: "Email verified", done: user.email_verified },
    { label: "Display name set", done: !!(profile?.display_name) },
    { label: "First name set", done: !!(profile?.first_name) },
    { label: "State / region set", done: !!(profile?.state_or_region) },
    { label: "LGA set", done: !!(profile?.local_government_area) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${displayName}`}
        description="Your AgroConnect buyer dashboard"
        action={
          <Link
            href="/buyer/profile"
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            Edit profile
          </Link>
        }
      />

      {/* Verification warning */}
      {(!user.phone_verified || !user.email_verified) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Verify your contact details</p>
          <p className="mt-0.5 text-xs">
            {!user.phone_verified && !user.email_verified
              ? "Neither your phone nor email is verified."
              : !user.phone_verified
              ? "Your phone number is not verified."
              : "Your email address is not verified."}{" "}
            Verification is required to place orders and receive notifications.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active requests" value={stats.activeRequests} accentColor="text-agro-green" />
        <StatCard label="Fulfilled requests" value={stats.fulfilledRequests} accentColor="text-deep-navy" />
        <StatCard label="Closed / expired" value={stats.cancelledRequests} accentColor="text-deep-navy/50" />
      </div>

      {/* Profile completion */}
      <ProfileCompletion items={completionItems} />

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/buyer-requests/new",
              label: "Post a Request",
              color: "bg-agro-green/10 text-agro-green border-agro-green/20",
            },
            {
              href: "/buyer/my-requests",
              label: "My Requests",
              color: "bg-deep-navy/5 text-deep-navy border-deep-navy/15",
            },
            {
              href: "/marketplace",
              label: "Browse Marketplace",
              color: "bg-fresh-green/10 text-agro-green border-fresh-green/20",
            },
            {
              href: "/buyer-requests",
              label: "All Buyer Requests",
              color: "bg-harvest-gold/10 text-amber-700 border-harvest-gold/20",
            },
            {
              href: "/buyer/profile",
              label: "Edit Profile",
              color: "bg-deep-navy/5 text-deep-navy border-deep-navy/15",
            },
            {
              href: "/profile",
              label: "Account Settings",
              color: "bg-deep-navy/5 text-deep-navy border-deep-navy/15",
            },
            {
              href: "/messages",
              label: "Messages",
              color: "bg-agro-green/10 text-agro-green border-agro-green/20",
            },
          ].map(({ href, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-80 ${color}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Buyer Requests section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">Buyer Requests</h2>
          <Link href="/buyer/my-requests" className="text-xs font-semibold text-agro-green hover:underline">View all →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/buyer-requests/new", title: "Post a Request", desc: "Tell farmers exactly what produce you need and receive offers.", color: "border-agro-green/20 bg-agro-green/5" },
            { href: "/buyer/my-requests", title: "My Requests", desc: "Manage your active requests, pause or mark them as fulfilled.", color: "border-deep-navy/10 bg-white" },
            { href: "/buyer-requests", title: "Browse All Requests", desc: "See all open buyer requests across the marketplace.", color: "border-harvest-gold/20 bg-harvest-gold/5" },
          ].map(({ href, title, desc, color }) => (
            <Link key={href} href={href} className={`flex flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${color}`}>
              <p className="font-heading text-sm font-bold text-deep-navy">{title}</p>
              <p className="mt-1 text-xs leading-5 text-deep-navy/55">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent notifications */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Recent notifications
        </h2>
        <div className="rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
          {notifications === null ? (
            <div className="p-6">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-deep-navy/5" />
                ))}
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="Activity on your requests and offers will appear here."
            />
          ) : (
            <ul className="divide-y divide-deep-navy/5">
              {notifications.map((n) => {
                const href = mapNotificationActionUrl(n.action_url);
                const body = (
                  <>
                    <span
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                        n.is_read ? "bg-deep-navy/20" : "bg-agro-green"
                      }`}
                      aria-label={n.is_read ? "read" : "unread"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-deep-navy">{n.title}</p>
                      <p className="mt-0.5 truncate text-xs text-deep-navy/60">{n.message}</p>
                    </div>
                    <time className="shrink-0 text-xs text-deep-navy/40">
                      {new Date(n.created_at).toLocaleDateString()}
                    </time>
                  </>
                );
                return (
                  <li key={n.id} className="px-5 py-3">
                    {href ? (
                      <Link href={href} className="flex items-start gap-3 hover:opacity-75">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-xl bg-deep-navy/10" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-32 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{message}</p>
      <a href="/login" className="mt-4 block text-sm font-semibold text-agro-green hover:underline">
        Return to login
      </a>
    </div>
  );
}
