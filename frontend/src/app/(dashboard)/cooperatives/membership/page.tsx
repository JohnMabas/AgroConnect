"use client";

import { useEffect, useState } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { cooperativeApi, type ApiError } from "@/lib/api";

type MembershipStatus = "pending" | "active" | "rejected" | "suspended" | "left";
type CoopStatus = "pending" | "approved" | "rejected" | "suspended";

interface CooperativeData {
  id: string;
  cooperative_name: string;
  verification_status: CoopStatus;
  description: string | null;
  state_or_region: string | null;
  country: string | null;
}

interface MembershipData {
  id: string;
  cooperative_id: string;
  status: MembershipStatus;
  membership_role: string;
  joined_at: string | null;
}

const MEMBER_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-harvest-gold/10 text-harvest-gold",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
  left: "bg-gray-100 text-gray-500",
};

export default function CooperativeMembershipPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [cooperatives, setCooperatives] = useState<CooperativeData[]>([]);
  const [myMemberships, setMyMemberships] = useState<MembershipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const [coopsRes, membershipsRes] = await Promise.allSettled([
          cooperativeApi.getApproved(token!) as Promise<{
            data: { cooperatives: CooperativeData[] };
          }>,
          cooperativeApi.getMyMemberships(token!) as Promise<{
            data: { memberships: MembershipData[] };
          }>,
        ]);
        if (coopsRes.status === "fulfilled") {
          setCooperatives(coopsRes.value.data.cooperatives);
        }
        if (membershipsRes.status === "fulfilled") {
          setMyMemberships(membershipsRes.value.data.memberships);
        }
      } catch {
        // handled per-call above
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  function getMembership(coopId: string): MembershipData | undefined {
    return myMemberships.find(
      (m) =>
        m.cooperative_id === coopId &&
        (m.status === "active" || m.status === "pending"),
    );
  }

  async function requestMembership(coopId: string) {
    if (!token) return;
    setJoiningId(coopId);
    setActionError("");
    setActionSuccess("");
    try {
      const res = (await cooperativeApi.requestMembership(token, coopId)) as {
        data: { membership: MembershipData };
      };
      setMyMemberships((prev) => [res.data.membership, ...prev]);
      setActionSuccess("Membership request submitted. Awaiting approval from the cooperative.");
    } catch (err) {
      setActionError((err as ApiError).message ?? "Failed to request membership.");
    } finally {
      setJoiningId(null);
    }
  }

  async function leaveMembership(coopId: string, membershipId: string) {
    if (!token) return;
    setLeavingId(membershipId);
    setActionError("");
    setActionSuccess("");
    try {
      const res = (await cooperativeApi.leaveMembership(
        token,
        coopId,
        membershipId,
      )) as { data: { membership: MembershipData } };
      setMyMemberships((prev) =>
        prev.map((m) =>
          m.id === membershipId ? res.data.membership : m,
        ),
      );
      setActionSuccess("You have left the cooperative.");
    } catch (err) {
      setActionError((err as ApiError).message ?? "Failed to leave cooperative.");
    } finally {
      setLeavingId(null);
    }
  }

  if (authLoading || loading) {
    return <PageSkeleton />;
  }

  if (authError) {
    return <ErrorCard message={authError} />;
  }

  // Active / pending memberships
  const activeMemberships = myMemberships.filter(
    (m) => m.status === "active" || m.status === "pending",
  );

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Cooperatives
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Browse approved cooperatives and manage your memberships.
        </p>
      </div>

      {/* Feedback */}
      {actionError && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {actionSuccess}
        </div>
      )}

      {/* My memberships */}
      {activeMemberships.length > 0 && (
        <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
            My Memberships
          </h2>
          <ul className="space-y-2">
            {activeMemberships.map((m) => {
              const coop = cooperatives.find((c) => c.id === m.cooperative_id);
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-deep-navy/10 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-deep-navy">
                      {coop?.cooperative_name ?? `Cooperative ${m.cooperative_id.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-deep-navy/50 capitalize">
                      {m.membership_role}
                      {m.joined_at && ` · Joined ${new Date(m.joined_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${MEMBER_STATUS_STYLES[m.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {m.status}
                    </span>
                    {m.status === "active" && (
                      <button
                        type="button"
                        disabled={leavingId === m.id}
                        onClick={() => leaveMembership(m.cooperative_id, m.id)}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        {leavingId === m.id ? "Leaving…" : "Leave"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Available cooperatives */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Approved Cooperatives
        </h2>
        {cooperatives.length === 0 ? (
          <p className="text-sm text-deep-navy/50">
            No approved cooperatives found. Check back soon.
          </p>
        ) : (
          <ul className="divide-y divide-deep-navy/5">
            {cooperatives.map((coop) => {
              const myMembership = getMembership(coop.id);
              return (
                <li key={coop.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-deep-navy">{coop.cooperative_name}</p>
                      {(coop.state_or_region || coop.country) && (
                        <p className="text-xs text-deep-navy/50">
                          {[coop.state_or_region, coop.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {coop.description && (
                        <p className="mt-1 text-sm text-deep-navy/70 line-clamp-2">
                          {coop.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {myMembership ? (
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${MEMBER_STATUS_STYLES[myMembership.status]}`}
                        >
                          {myMembership.status}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={joiningId === coop.id}
                          onClick={() => requestMembership(coop.id)}
                          className="rounded-full bg-agro-green px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-deep-navy disabled:opacity-60"
                        >
                          {joiningId === coop.id ? "Requesting…" : "Join"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 h-14 rounded-xl bg-deep-navy/5" />
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
