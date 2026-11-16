"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { cooperativeApi } from "@/lib/api";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";

type CoopStatus = "pending" | "approved" | "rejected" | "suspended";

interface CoopSummary {
  id: string;
  cooperative_name: string;
  verification_status: CoopStatus;
  state_or_region: string | null;
  created_at: string;
}

interface CoopCounts {
  total: number | null;
  pending: number | null;
  approved: number | null;
  rejected: number | null;
  suspended: number | null;
}

const STATUS_BADGE: Record<CoopStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-500",
};

export default function AdminOverviewPage() {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth("admin");

  const [counts, setCounts] = useState<CoopCounts>({
    total: null,
    pending: null,
    approved: null,
    rejected: null,
    suspended: null,
  });
  const [recentPending, setRecentPending] = useState<CoopSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        const res = (await cooperativeApi.adminList(token!)) as {
          data: { cooperatives: CoopSummary[] };
        };
        const all = res.data.cooperatives;
        setCounts({
          total: all.length,
          pending: all.filter((c) => c.verification_status === "pending").length,
          approved: all.filter((c) => c.verification_status === "approved").length,
          rejected: all.filter((c) => c.verification_status === "rejected").length,
          suspended: all.filter((c) => c.verification_status === "suspended").length,
        });
        setRecentPending(
          all
            .filter((c) => c.verification_status === "pending")
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            .slice(0, 5),
        );
      } catch {
        setCounts({ total: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 });
      } finally {
        setDataLoading(false);
      }
    }

    void load();
  }, [token]);

  if (authLoading || dataLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;
  if (!user) return null;

  const displayName = user.display_name ?? user.email ?? "Admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Admin Overview`}
        description={`Welcome, ${displayName}. Platform administration dashboard.`}
      />

      {/* Cooperative counts */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Cooperative applications
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={counts.total} accentColor="text-deep-navy" />
          <StatCard label="Pending review" value={counts.pending} accentColor="text-amber-600" />
          <StatCard label="Approved" value={counts.approved} accentColor="text-agro-green" />
          <StatCard label="Rejected / Suspended" value={
            counts.rejected !== null && counts.suspended !== null
              ? counts.rejected + counts.suspended
              : null
          } accentColor="text-red-500" />
        </div>
      </section>

      {/* Admin quick links */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Administration
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/admin/cooperatives",
              label: "Manage cooperatives",
              description: "Review, approve or reject cooperative applications.",
              color: "border-agro-green/20 hover:border-agro-green/40",
              badge: counts.pending ? `${counts.pending} pending` : null,
              badgeColor: "bg-amber-100 text-amber-700",
            },
            {
              href: "/admin/pilot",
              label: "Pilot dashboard",
              description: "Manage and monitor the controlled pilot programme.",
              color: "border-deep-navy/15 hover:border-deep-navy/30",
              badge: null,
              badgeColor: "",
            },
          ].map(({ href, label, description, color, badge, badgeColor }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-colors ${color}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading text-sm font-bold text-deep-navy">{label}</h3>
                {badge && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-deep-navy/60">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Coming soon admin modules */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Coming soon
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "User management", description: "View and manage all platform user accounts." },
            { title: "Transporter approvals", description: "Review and approve transporter applications." },
            { title: "Verification review", description: "Process identity and business verification requests." },
            { title: "Market observations", description: "Moderate market price observation submissions." },
            { title: "Review moderation", description: "Moderate flagged user reviews and reports." },
            { title: "Platform notifications", description: "Send system announcements to platform users." },
          ].map(({ title, description }) => (
            <div
              key={title}
              className="relative flex flex-col rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm"
            >
              <span className="absolute right-3 top-3 rounded-full bg-deep-navy/8 px-2 py-0.5 text-xs font-semibold text-deep-navy/40">
                Coming soon
              </span>
              <h3 className="font-heading text-sm font-bold text-deep-navy/60">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-deep-navy/40">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pending cooperative applications */}
      {recentPending.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
              Pending cooperative applications
            </h2>
            <Link
              href="/admin/cooperatives"
              className="text-xs font-semibold text-agro-green hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
            <ul className="divide-y divide-deep-navy/5">
              {recentPending.map((coop) => (
                <li
                  key={coop.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-deep-navy">
                      {coop.cooperative_name}
                    </p>
                    <p className="mt-0.5 text-xs text-deep-navy/50">
                      {coop.state_or_region ?? "Location not set"} ·{" "}
                      {new Date(coop.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        STATUS_BADGE[coop.verification_status]
                      }`}
                    >
                      {coop.verification_status}
                    </span>
                    <Link
                      href="/admin/cooperatives"
                      className="text-xs font-semibold text-agro-green hover:underline"
                    >
                      Review →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-xl bg-deep-navy/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
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
