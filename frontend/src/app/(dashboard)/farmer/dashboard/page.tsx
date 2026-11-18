"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { listingsApi, farmerApi, notificationsApi, type ListingData, type NotificationData } from "@/lib/api";
import { mapNotificationActionUrl } from "@/lib/messaging";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProfileCompletion } from "@/components/dashboard/profile-completion";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

interface FarmerProfileData {
  farm_name: string | null;
  farm_location: string | null;
  farm_size: number | null;
  farming_experience_years: number | null;
  farming_description: string | null;
  primary_produce_interests: string[] | null;
  verification_status: string;
}

interface DashboardStats {
  activeListings: number | null;
  availableQty: number | null;
  reservedQty: number | null;
  soldQty: number | null;
}

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

export default function FarmerDashboardPage() {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth("farmer");

  const [farmerProfile, setFarmerProfile] = useState<FarmerProfileData | null | "not_found">(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeListings: null,
    availableQty: null,
    reservedQty: null,
    soldQty: null,
  });
  const [notifications, setNotifications] = useState<NotificationData[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        const [listingsRes, profileRes, notifRes] = await Promise.allSettled([
          listingsApi.getMe(token!, 1, 100),
          farmerApi.getMe(token!) as Promise<{ data: { profile: FarmerProfileData } }>,
          notificationsApi.getNotifications(token!, { limit: 5 }),
        ]);

        // Process listings
        if (listingsRes.status === "fulfilled") {
          const listings: ListingData[] = listingsRes.value.data.listings;
          const active = listings.filter((l) => l.status === "published");
          const avail = active.reduce((sum, l) => sum + Number(l.available_quantity), 0);
          const reserved = active.reduce((sum, l) => sum + Number(l.reserved_quantity), 0);
          const sold = listings.reduce((sum, l) => sum + Number(l.sold_quantity), 0);
          setStats({
            activeListings: active.length,
            availableQty: Math.round(avail * 100) / 100,
            reservedQty: Math.round(reserved * 100) / 100,
            soldQty: Math.round(sold * 100) / 100,
          });
        } else {
          setStats({ activeListings: 0, availableQty: 0, reservedQty: 0, soldQty: 0 });
        }

        // Process farmer profile
        if (profileRes.status === "fulfilled") {
          setFarmerProfile(profileRes.value.data.profile);
        } else {
          setFarmerProfile("not_found");
        }

        // Process notifications
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

  if (authLoading || dataLoading) {
    return <PageSkeleton />;
  }

  if (authError) {
    return <ErrorCard message={authError} />;
  }

  if (!user) return null;

  const displayName =
    (farmerProfile && farmerProfile !== "not_found" ? farmerProfile.farm_name : null) ??
    user.display_name ??
    user.email ??
    user.phone_number ??
    "Farmer";

  const completionItems = [
    { label: "Phone verified", done: user.phone_verified },
    { label: "Email verified", done: user.email_verified },
    {
      label: "Farmer profile created",
      done: farmerProfile !== null && farmerProfile !== "not_found",
    },
    {
      label: "Farm name set",
      done: farmerProfile !== null && farmerProfile !== "not_found" && !!farmerProfile.farm_name,
    },
    {
      label: "Farm location set",
      done: farmerProfile !== null && farmerProfile !== "not_found" && !!farmerProfile.farm_location,
    },
    {
      label: "Produce interests listed",
      done:
        farmerProfile !== null &&
        farmerProfile !== "not_found" &&
        !!farmerProfile.primary_produce_interests?.length,
    },
    {
      label: "First listing created",
      done: (stats.activeListings ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${displayName}`}
        description="Your AgroConnect farmer dashboard"
        action={
          <Link
            href="/farmer/listings/create"
            className="rounded-full bg-agro-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
          >
            + Add produce
          </Link>
        }
      />

      {/* Profile not created warning */}
      {farmerProfile === "not_found" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Complete your farmer profile</p>
          <p className="mt-0.5 text-xs">
            Set up your farmer profile to access cooperative features and create listings.{" "}
            <Link href="/farmer/profile" className="font-medium underline hover:text-amber-900">
              Set up now →
            </Link>
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active listings" value={stats.activeListings} accentColor="text-agro-green" />
        <StatCard label="Available qty" value={stats.availableQty} accentColor="text-fresh-green" />
        <StatCard label="Reserved qty" value={stats.reservedQty} accentColor="text-harvest-gold" />
        <StatCard label="Sold qty" value={stats.soldQty} accentColor="text-deep-navy" />
      </div>

      {/* Profile completion */}
      <ProfileCompletion items={completionItems} />

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/farmer/listings/create", label: "Add Produce", color: "bg-agro-green/10 text-agro-green border-agro-green/20" },
            { href: "/farmer/listings", label: "My Listings", color: "bg-deep-navy/5 text-deep-navy border-deep-navy/15" },
            { href: "/farmer/profile", label: "My Farm Profile", color: "bg-harvest-gold/10 text-amber-700 border-harvest-gold/20" },
            { href: "/cooperatives/membership", label: "Cooperatives", color: "bg-fresh-green/15 text-agro-green border-fresh-green/25" },
            { href: "/messages", label: "Messages", color: "bg-agro-green/10 text-agro-green border-agro-green/20" },
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

      {/* Buyer Demand section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">Buyer Demand</h2>
          <Link href="/farmer/buyer-requests" className="text-xs font-semibold text-agro-green hover:underline">View all →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/farmer/buyer-requests", title: "Discover Requests", desc: "Find buyers looking for your produce and respond with offers.", color: "border-agro-green/20 bg-agro-green/5" },
            { href: "/buyer-requests", title: "Public Demand Board", desc: "See all open buyer requests across the marketplace.", color: "border-deep-navy/10 bg-white" },
            { href: "/marketplace", title: "Marketplace", desc: "Browse all published listings and understand market pricing.", color: "border-harvest-gold/20 bg-harvest-gold/5" },
          ].map(({ href, title, desc, color }) => (
            <Link key={href} href={href} className={`flex flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${color}`}>
              <p className="font-heading text-sm font-bold text-deep-navy">{title}</p>
              <p className="mt-1 text-xs leading-5 text-deep-navy/55">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Buyer Demand section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">Buyer Demand</h2>
          <Link href="/farmer/buyer-requests" className="text-xs font-semibold text-agro-green hover:underline">Discover requests →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/farmer/buyer-requests", title: "Discover Requests", desc: "Find buyers looking for your produce and respond with offers.", color: "border-agro-green/20 bg-agro-green/5" },
            { href: "/buyer-requests", title: "Public Demand Board", desc: "Browse all open buyer requests across the marketplace.", color: "border-deep-navy/10 bg-white" },
            { href: "/marketplace", title: "Browse Marketplace", desc: "See all published listings and understand current pricing.", color: "border-harvest-gold/20 bg-harvest-gold/5" },
          ].map(({ href, title, desc, color }) => (
            <Link key={href} href={href} className={`flex flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${color}`}>
              <p className="font-heading text-sm font-bold text-deep-navy">{title}</p>
              <p className="mt-1 text-xs leading-5 text-deep-navy/55">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Coming soon features */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Coming soon
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ComingSoonCard title="Offers" description="Manage buyer offers on your listings." />
          <ComingSoonCard title="Orders" description="Track orders from accepted offers through to delivery." />
          <ComingSoonCard title="Market Insights" description="View aggregated market price trends and analytics." />
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
              description="You'll be notified when buyers interact with your listings."
            />
          ) : (
            <ul className="divide-y divide-deep-navy/5">
              {notifications.map((n) => {
                const href = mapNotificationActionUrl(n.action_url);
                const body = (
                  <>
                    <span
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-deep-navy/20" : "bg-agro-green"}`}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
