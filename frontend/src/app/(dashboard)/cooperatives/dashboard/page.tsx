"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { cooperativeApi } from "@/lib/api";

type CoopStatus = "pending" | "approved" | "rejected" | "suspended";
type MembershipStatus = "pending" | "active" | "rejected" | "suspended" | "left";
type AgentStatus = "active" | "deactivated";

interface CooperativeData {
  id: string;
  cooperative_name: string;
  verification_status: CoopStatus;
  approval_notes: string | null;
  registration_number: string | null;
  description: string | null;
  country: string | null;
  state_or_region: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
}

interface MembershipData {
  id: string;
  farmer_user_id: string;
  status: MembershipStatus;
  membership_role: string;
  joined_at: string | null;
}

interface AgentData {
  id: string;
  agent_user_id: string;
  status: AgentStatus;
  assigned_at: string;
}

const STATUS_STYLES: Record<CoopStatus, string> = {
  pending: "bg-harvest-gold/10 text-harvest-gold",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
};

const MEMBER_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-harvest-gold/10 text-harvest-gold",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
  left: "bg-gray-100 text-gray-500",
};

export default function CooperativeDashboardPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [coop, setCoop] = useState<CooperativeData | null>(null);
  const [members, setMembers] = useState<MembershipData[]>([]);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [coopLoading, setCoopLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = (await cooperativeApi.getMe(token!)) as {
          data: { cooperative: CooperativeData };
        };
        const coopData = res.data.cooperative;
        setCoop(coopData);

        if (coopData.verification_status === "approved") {
          setMembersLoading(true);
          const [membersRes, agentsRes] = await Promise.allSettled([
            cooperativeApi.getMembers(token!, coopData.id) as Promise<{
              data: { memberships: MembershipData[] };
            }>,
            cooperativeApi.getAgents(token!, coopData.id) as Promise<{
              data: { assignments: AgentData[] };
            }>,
          ]);
          if (membersRes.status === "fulfilled") {
            setMembers(membersRes.value.data.memberships);
          }
          if (agentsRes.status === "fulfilled") {
            setAgents(agentsRes.value.data.assignments);
          }
          setMembersLoading(false);
        }
      } catch {
        // No cooperative yet
      } finally {
        setCoopLoading(false);
      }
    }
    void load();
  }, [token]);

  async function approveMember(membershipId: string) {
    if (!token || !coop) return;
    setApprovingId(membershipId);
    setActionError("");
    try {
      const res = (await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/cooperatives/${coop.id}/memberships/${membershipId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "active" }),
        },
      ).then((r) => r.json())) as { data: { membership: MembershipData } };
      setMembers((prev) =>
        prev.map((m) =>
          m.id === membershipId ? { ...m, status: res.data.membership.status } : m,
        ),
      );
    } catch {
      setActionError("Failed to approve membership. Please try again.");
    } finally {
      setApprovingId(null);
    }
  }

  async function rejectMember(membershipId: string) {
    if (!token || !coop) return;
    setRejectingId(membershipId);
    setActionError("");
    try {
      const res = (await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/cooperatives/${coop.id}/memberships/${membershipId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "rejected" }),
        },
      ).then((r) => r.json())) as { data: { membership: MembershipData } };
      setMembers((prev) =>
        prev.map((m) =>
          m.id === membershipId ? { ...m, status: res.data.membership.status } : m,
        ),
      );
    } catch {
      setActionError("Failed to reject membership. Please try again.");
    } finally {
      setRejectingId(null);
    }
  }

  if (authLoading || coopLoading) {
    return <PageSkeleton />;
  }

  if (authError) {
    return <ErrorCard message={authError} />;
  }

  if (!coop) {
    return (
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-xl font-bold text-deep-navy">No Cooperative Found</h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          You haven&apos;t registered a cooperative yet.
        </p>
        <Link
          href="/cooperatives/register"
          className="mt-4 inline-block rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
        >
          Register a cooperative
        </Link>
      </div>
    );
  }

  const pendingMembers = members.filter((m) => m.status === "pending");
  const activeMembers = members.filter((m) => m.status === "active");
  const activeAgents = agents.filter((a) => a.status === "active");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            {coop.cooperative_name}
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">Cooperative Dashboard</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[coop.verification_status]}`}
        >
          {coop.verification_status}
        </span>
      </div>

      {/* Status banner */}
      {coop.verification_status === "pending" && (
        <div className="rounded-xl border border-harvest-gold/30 bg-harvest-gold/5 px-4 py-3 text-sm text-harvest-gold">
          Your cooperative is pending admin review. Full features will be available once approved.
        </div>
      )}
      {coop.verification_status === "rejected" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Your cooperative application was rejected.
          {coop.approval_notes && (
            <p className="mt-1 font-medium">Reason: {coop.approval_notes}</p>
          )}
        </div>
      )}
      {coop.verification_status === "suspended" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Your cooperative has been suspended. Please contact support.
          {coop.approval_notes && (
            <p className="mt-1 font-medium">Notes: {coop.approval_notes}</p>
          )}
        </div>
      )}

      {/* Info card */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Cooperative Details
        </h2>
        <dl className="space-y-2 text-sm">
          {coop.registration_number && (
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-deep-navy/50">Reg. Number</dt>
              <dd className="font-medium text-deep-navy">{coop.registration_number}</dd>
            </div>
          )}
          {coop.state_or_region && (
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-deep-navy/50">Location</dt>
              <dd className="font-medium text-deep-navy">
                {coop.state_or_region}
                {coop.country ? `, ${coop.country}` : ""}
              </dd>
            </div>
          )}
          {coop.contact_phone && (
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-deep-navy/50">Phone</dt>
              <dd className="font-medium text-deep-navy">{coop.contact_phone}</dd>
            </div>
          )}
          {coop.contact_email && (
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-deep-navy/50">Email</dt>
              <dd className="font-medium text-deep-navy">{coop.contact_email}</dd>
            </div>
          )}
          {coop.description && (
            <div className="flex gap-2">
              <dt className="w-36 shrink-0 text-deep-navy/50">About</dt>
              <dd className="text-deep-navy/80">{coop.description}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Only show member/agent sections if approved */}
      {coop.verification_status === "approved" && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Active Members" value={activeMembers.length} />
            <StatCard label="Pending Requests" value={pendingMembers.length} />
            <StatCard label="Active Agents" value={activeAgents.length} />
          </div>

          {/* Pending membership requests */}
          {pendingMembers.length > 0 && (
            <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                Pending Membership Requests
              </h2>
              {actionError && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
              )}
              <ul className="space-y-2">
                {pendingMembers.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-deep-navy/10 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-deep-navy">
                        User {m.farmer_user_id.slice(0, 8)}…
                      </p>
                      <p className="text-xs text-deep-navy/50 capitalize">{m.membership_role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={approvingId === m.id}
                        onClick={() => approveMember(m.id)}
                        className="rounded-full bg-agro-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-deep-navy disabled:opacity-60"
                      >
                        {approvingId === m.id ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={rejectingId === m.id}
                        onClick={() => rejectMember(m.id)}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        {rejectingId === m.id ? "Rejecting…" : "Reject"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Members */}
          {membersLoading ? (
            <div className="animate-pulse rounded-2xl bg-white p-6 shadow-sm">
              <div className="h-5 w-32 rounded bg-deep-navy/10 mb-4" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-2 h-10 rounded-xl bg-deep-navy/5" />
              ))}
            </div>
          ) : (
            <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                Members ({activeMembers.length})
              </h2>
              {activeMembers.length === 0 ? (
                <p className="text-sm text-deep-navy/50">No active members yet.</p>
              ) : (
                <ul className="space-y-2">
                  {activeMembers.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-deep-navy/10 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-deep-navy">
                          User {m.farmer_user_id.slice(0, 8)}…
                        </p>
                        <p className="text-xs text-deep-navy/50 capitalize">{m.membership_role}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${MEMBER_STATUS_STYLES[m.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {m.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Agents */}
          <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
              Agents ({activeAgents.length})
            </h2>
            {activeAgents.length === 0 ? (
              <p className="text-sm text-deep-navy/50">
                No agents assigned yet. Contact an admin to assign agents.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeAgents.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-deep-navy/10 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-deep-navy">
                      Agent {a.agent_user_id.slice(0, 8)}…
                    </p>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold capitalize text-green-700">
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm text-center">
      <p className="font-heading text-3xl font-extrabold text-agro-green">{value}</p>
      <p className="mt-1 text-sm text-deep-navy/60">{label}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-xl bg-deep-navy/10" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm h-24" />
        ))}
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-2 h-10 rounded-xl bg-deep-navy/5" />
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
