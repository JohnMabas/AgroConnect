"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  transporterApi,
  deliveriesApi,
  notificationsApi,
  type DeliveryData,
  type NotificationData,
} from "@/lib/api";
import { mapNotificationActionUrl } from "@/lib/messaging";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProfileCompletion } from "@/components/dashboard/profile-completion";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
type AvailabilityStatus = "available" | "unavailable" | "suspended";

interface TransporterProfile {
  id: string;
  business_name: string | null;
  contact_phone: string | null;
  operating_location: string | null;
  coverage_areas: string[] | null;
  produce_types: string[] | null;
  vehicle_type: string | null;
  availability_status: AvailabilityStatus;
  approval_status: ApprovalStatus;
  suspended_reason: string | null;
}

interface DeliveryStats {
  assigned: number | null;
  inProgress: number | null;
  completed: number | null;
}

const APPROVAL_INFO: Record<ApprovalStatus, { badge: string; message: string }> = {
  pending: {
    badge: "bg-amber-100 text-amber-700",
    message:
      "Your transporter profile is under review. You will be notified by SMS or email when approved.",
  },
  approved: {
    badge: "bg-green-100 text-green-700",
    message: "Your profile is approved. You can now receive delivery assignments.",
  },
  rejected: {
    badge: "bg-red-100 text-red-700",
    message:
      "Your transporter application was not approved. Please contact support for assistance.",
  },
  suspended: {
    badge: "bg-gray-100 text-gray-600",
    message: "Your account has been suspended. Contact support to resolve this.",
  },
};

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative flex flex-col rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
      <span className="absolute right-3 top-3 rounded-full bg-deep-navy/8 px-2 py-0.5 text-xs font-semibold text-deep-navy/40">
        Coming soon
      </span>
      <h3 className="font-heading text-sm font-bold text-deep-navy/60">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-deep-navy/40">{description}</p>
    </div>
  );
}

export default function TransporterDashboardPage() {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth("transporter");

  const [profile, setProfile] = useState<TransporterProfile | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats>({
    assigned: null,
    inProgress: null,
    completed: null,
  });
  const [notifications, setNotifications] = useState<NotificationData[] | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        const [profileRes, deliveriesRes, notifRes] = await Promise.allSettled([
          transporterApi.getMe(token!) as Promise<{ data: { profile: TransporterProfile } }>,
          deliveriesApi.getMyDeliveries(token!, { limit: 20 }),
          notificationsApi.getNotifications(token!, { limit: 5 }),
        ]);

        if (profileRes.status === "fulfilled") {
          setProfile(profileRes.value.data.profile);
        }

        if (deliveriesRes.status === "fulfilled") {
          const deliveries = deliveriesRes.value.data.deliveries;
          setRecentDeliveries(deliveries.slice(0, 5));
          setDeliveryStats({
            assigned: deliveries.filter(
              (d) => d.status === "assigned" || d.status === "accepted",
            ).length,
            inProgress: deliveries.filter(
              (d) =>
                d.status === "picked_up" || d.status === "in_transit",
            ).length,
            completed: deliveries.filter(
              (d) => d.status === "delivered" || d.status === "completed",
            ).length,
          });
        } else {
          setDeliveryStats({ assigned: 0, inProgress: 0, completed: 0 });
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
    profile?.business_name ??
    user.display_name ??
    user.email ??
    user.phone_number ??
    "Transporter";

  const approval = profile?.approval_status ?? "pending";
  const approvalInfo = APPROVAL_INFO[approval];
  const isApproved = approval === "approved";

  const completionItems = [
    { label: "Phone verified", done: user.phone_verified },
    { label: "Email verified", done: user.email_verified },
    { label: "Business name set", done: !!profile?.business_name },
    { label: "Contact phone set", done: !!profile?.contact_phone },
    { label: "Operating location set", done: !!profile?.operating_location },
    { label: "Coverage areas set", done: !!(profile?.coverage_areas?.length) },
    { label: "Vehicle type set", done: !!profile?.vehicle_type },
    { label: "Profile approved", done: isApproved },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${displayName}`}
        description="Your AgroConnect transporter dashboard"
        action={
          <Link
            href="/transporter/profile"
            className="rounded-full bg-agro-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
          >
            Edit profile
          </Link>
        }
      />

      {/* Approval status banner */}
      <section
        className={`rounded-xl border px-4 py-4 text-sm ${
          isApproved
            ? "border-green-200 bg-green-50"
            : approval === "rejected" || approval === "suspended"
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${approvalInfo.badge}`}>
            {approval.charAt(0).toUpperCase() + approval.slice(1)}
          </span>
          {isApproved && profile && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                profile.availability_status === "available"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {profile.availability_status === "available" ? "Available" : "Unavailable"}
            </span>
          )}
        </div>
        <p
          className={`mt-1.5 text-xs ${
            isApproved
              ? "text-green-700"
              : approval === "rejected" || approval === "suspended"
              ? "text-red-700"
              : "text-amber-700"
          }`}
        >
          {approvalInfo.message}
          {approval === "suspended" && profile?.suspended_reason
            ? ` Reason: ${profile.suspended_reason}`
            : ""}
        </p>
        {isApproved && (
          <div className="mt-2">
            <Link
              href="/transporter/profile"
              className="text-xs font-semibold text-agro-green hover:underline"
            >
              Update availability →
            </Link>
          </div>
        )}
      </section>

      {/* Delivery stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Assigned deliveries"
          value={deliveryStats.assigned}
          accentColor="text-harvest-gold"
        />
        <StatCard
          label="In progress"
          value={deliveryStats.inProgress}
          accentColor="text-agro-green"
        />
        <StatCard
          label="Completed"
          value={deliveryStats.completed}
          accentColor="text-deep-navy"
        />
      </div>

      {/* Profile completion */}
      <ProfileCompletion items={completionItems} title="Transport profile completion" />

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/transporter/profile",
              label: "Transport profile",
              color: "bg-agro-green/10 text-agro-green border-agro-green/20",
            },
            {
              href: "/profile",
              label: "Account settings",
              color: "bg-deep-navy/5 text-deep-navy border-deep-navy/15",
            },
            {
              href: "/",
              label: "Back to homepage",
              color: "bg-harvest-gold/10 text-amber-700 border-harvest-gold/20",
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

      {/* Recent deliveries */}
      {recentDeliveries.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
            Recent deliveries
          </h2>
          <div className="rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
            <ul className="divide-y divide-deep-navy/5">
              {recentDeliveries.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-deep-navy">
                      {d.delivery_reference}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-deep-navy/60">
                      {d.delivery_location ?? "Location not set"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      d.status === "completed" || d.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : d.status === "in_transit" || d.status === "picked_up"
                        ? "bg-agro-green/10 text-agro-green"
                        : d.status === "cancelled" || d.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {d.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Coming soon */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Coming soon
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ComingSoonCard
            title="Delivery requests"
            description="Browse and accept delivery requests in your coverage area."
          />
          <ComingSoonCard
            title="Live delivery tracking"
            description="Update delivery status in real time for buyers and farmers."
          />
          <ComingSoonCard
            title="Delivery history"
            description="View your complete delivery history and earnings."
          />
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
              description="Delivery assignments and updates will appear here."
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
      <div className="h-16 rounded-xl bg-amber-50" />
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
