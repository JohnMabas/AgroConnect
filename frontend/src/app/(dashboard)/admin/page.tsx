"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { adminApi, type AdminOverviewData, type AdminAuditLogData } from "@/lib/api";
import { StatCard } from "@/components/dashboard/stat-card";

const OVERVIEW_LINKS: Array<{
  href: string;
  label: string;
  description: string;
}> = [
  {
    href: "/admin/users",
    label: "Users",
    description: "View every account, roles and verification status.",
  },
  {
    href: "/admin/transporters",
    label: "Transporters",
    description: "Review, approve, reject or suspend transporter applications.",
  },
  {
    href: "/admin/listings",
    label: "Listings",
    description: "Moderate produce listings across the marketplace.",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    description: "Inspect every order placed on the platform.",
  },
  {
    href: "/admin/payments",
    label: "Payments",
    description: "Track payment activity and outcomes.",
  },
  {
    href: "/admin/cooperatives",
    label: "Cooperatives",
    description: "Review cooperative registration applications.",
  },
  {
    href: "/admin/agents",
    label: "Agents",
    description: "Verify and suspend cooperative agents.",
  },
  {
    href: "/admin/complaints",
    label: "Complaints",
    description: "Handle farmer complaints and investigations.",
  },
  {
    href: "/admin/integrity",
    label: "Integrity alerts",
    description: "Review AI-detected risk and abuse signals.",
  },
  {
    href: "/admin/deliveries",
    label: "Deliveries",
    description: "Monitor deliveries across the platform.",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit logs",
    description: "Review the administrative action trail.",
  },
  {
    href: "/admin/pilot",
    label: "Pilot",
    description: "Manage the controlled pilot programme.",
  },
];

function formatNaira(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminOverviewPage() {
  const { token, user, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminAuditLogData[]>([]);
  const [loadError, setLoadError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        const [overviewRes, logsRes] = await Promise.all([
          adminApi.overview(token!),
          adminApi.listAuditLogs(token!, { limit: 5 }),
        ]);
        setOverview(overviewRes.data.overview);
        const logs = logsRes.data?.logs;
        setRecentLogs(Array.isArray(logs) ? logs : []);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load platform data.",
        );
      } finally {
        setDataLoading(false);
      }
    }

    void load();
  }, [token]);

  if (authLoading || dataLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;
  if (loadError) return <ErrorCard message={loadError} />;
  if (!user || !overview) return null;

  const displayName = user.display_name ?? user.email ?? "Admin";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          Platform administration
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Live platform totals for users, trade and safety operations.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Platform totals
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Users"
            value={overview.total_users}
            accentColor="text-deep-navy"
          />
          <StatCard
            label="Farmers"
            value={overview.total_farmers}
            accentColor="text-agro-green"
          />
          <StatCard
            label="Buyers"
            value={overview.total_buyers}
            accentColor="text-agro-green"
          />
          <StatCard
            label="Cooperatives"
            value={overview.registered_cooperatives}
            accentColor="text-deep-navy"
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active listings"
            value={overview.active_listings}
            accentColor="text-agro-green"
          />
          <StatCard
            label="Open buyer demand"
            value={overview.active_buyer_requests}
            accentColor="text-deep-navy"
          />
          <StatCard
            label="Orders"
            value={overview.total_orders}
            accentColor="text-deep-navy"
          />
          <StatCard
            label="Successful payments"
            value={overview.successful_payments}
            accentColor="text-agro-green"
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active deliveries"
            value={overview.active_deliveries}
            accentColor="text-deep-navy"
          />
          <StatCard
            label="Open complaints"
            value={overview.pending_complaints}
            accentColor="text-amber-600"
          />
          <StatCard
            label="Integrity alerts"
            value={overview.open_integrity_alerts}
            accentColor="text-red-500"
          />
          <StatCard
            label="Platform commission"
            value={formatNaira(
              overview.recorded_platform_commission_minor,
              overview.platform_commission_currency,
            )}
            accentColor="text-harvest-gold"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Needs attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/transporters?status=pending"
            className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition-colors hover:border-amber-400"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Transporters awaiting review
            </p>
            <p className="mt-2 font-heading text-3xl font-extrabold text-amber-600">
              {overview.pending_transporters}
            </p>
          </Link>
          <Link
            href="/admin/cooperatives"
            className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition-colors hover:border-amber-400"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Cooperatives awaiting review
            </p>
            <p className="mt-2 font-heading text-3xl font-extrabold text-amber-600">
              {overview.pending_cooperatives}
            </p>
          </Link>
          <Link
            href="/admin/payments?status=pending"
            className="rounded-2xl border border-deep-navy/15 bg-white p-5 shadow-sm transition-colors hover:border-deep-navy/30"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
              Payments pending
            </p>
            <p className="mt-2 font-heading text-3xl font-extrabold text-deep-navy">
              {overview.pending_payments}
            </p>
          </Link>
          <Link
            href="/admin/integrity?review_status=pending"
            className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm transition-colors hover:border-red-400"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Integrity alerts unreviewed
            </p>
            <p className="mt-2 font-heading text-3xl font-extrabold text-red-500">
              {overview.open_integrity_alerts}
            </p>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Administration
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW_LINKS.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col rounded-2xl border border-deep-navy/15 bg-white p-5 shadow-sm transition-colors hover:border-agro-green/40"
            >
              <h3 className="font-heading text-sm font-bold text-deep-navy">
                {label}
              </h3>
              <p className="mt-1 text-xs leading-5 text-deep-navy/60">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
            Recent administrative actions
          </h2>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-semibold text-agro-green hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
          {!recentLogs?.length ? (
            <p className="px-5 py-6 text-sm text-deep-navy/50">
              No administrative actions recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-deep-navy/5">
              {(Array.isArray(recentLogs) ? recentLogs : []).map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-deep-navy">
                      {log.action}
                      <span className="ml-2 font-normal text-deep-navy/50">
                        {log.entity_type}
                      </span>
                    </p>
                    {log.reason && (
                      <p className="mt-0.5 truncate text-xs text-deep-navy/50">
                        {log.reason}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="truncate text-xs font-semibold text-deep-navy/70">
                      {log.admin_display_name ?? "Administrator"}
                    </p>
                    <p className="text-xs text-deep-navy/45">
                      {relativeTime(log.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-lg bg-deep-navy/10" />
        <div className="h-8 w-72 rounded-xl bg-deep-navy/10" />
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{message}</p>
      <Link
        href="/admin"
        className="mt-4 inline-block rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
      >
        Try again
      </Link>
    </div>
  );
}
