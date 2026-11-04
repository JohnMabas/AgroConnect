"use client";

import { useEffect, useState } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { agentApi, type ApiError } from "@/lib/api";

interface AssignmentData {
  id: string;
  cooperative_id: string;
  agent_user_id: string;
  status: "active" | "deactivated";
  assigned_at: string;
}

interface ActivityData {
  id: string;
  farmer_user_id: string;
  cooperative_id: string | null;
  action: string;
  description: string | null;
  created_at: string;
}

export default function AgentDashboardPage() {
  // Only users with cooperative_agent role can access this page.
  const { token, user, loading: authLoading, error: authError } =
    useDashboardAuth("cooperative_agent");

  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const [assignRes, activityRes] = await Promise.allSettled([
          agentApi.getAssignments(token!) as Promise<{
            data: { assignments: AssignmentData[] };
          }>,
          agentApi.getActivities(token!) as Promise<{
            data: { activities: ActivityData[] };
          }>,
        ]);

        if (assignRes.status === "fulfilled") {
          setAssignments(assignRes.value.data.assignments);
        } else {
          setLoadError((assignRes.reason as ApiError).message ?? "Failed to load assignments.");
        }

        if (activityRes.status === "fulfilled") {
          setActivities(activityRes.value.data.activities);
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

  const activeAssignments = assignments.filter((a) => a.status === "active");

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Agent Dashboard
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Your cooperative assignments and recent activity.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Current user info */}
      {user && (
        <section className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-deep-navy/60">
            Logged in as{" "}
            <strong className="text-deep-navy">
              {user.display_name ?? user.phone_number ?? user.email ?? "Agent"}
            </strong>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-agro-green/10 px-3 py-1 text-xs font-semibold capitalize text-agro-green"
              >
                {role}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Active assignments */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          My Assignments ({activeAssignments.length})
        </h2>
        {activeAssignments.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-deep-navy/50">
              You have no active cooperative assignments.
            </p>
            <p className="mt-1 text-xs text-deep-navy/40">
              A cooperative representative must assign you before you can assist farmers.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {activeAssignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-deep-navy/10 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-deep-navy">
                    Cooperative {a.cooperative_id.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-deep-navy/50">
                    Assigned {new Date(a.assigned_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold capitalize text-green-700">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Recent Activity
        </h2>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-deep-navy/50">No activity recorded yet.</p>
            <p className="mt-1 text-xs text-deep-navy/40">
              Actions you perform on behalf of farmers will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-deep-navy/5">
            {activities.map((a) => (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-deep-navy capitalize">
                      {a.action.replaceAll("_", " ")}
                    </p>
                    {a.description && (
                      <p className="mt-0.5 text-xs text-deep-navy/60">{a.description}</p>
                    )}
                    <p className="mt-0.5 text-xs text-deep-navy/40">
                      Farmer {a.farmer_user_id.slice(0, 8)}…
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-deep-navy/40">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Important boundaries notice */}
      <section className="rounded-2xl border border-deep-navy/10 bg-soft-bg p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Agent Responsibilities
        </h2>
        <ul className="space-y-1 text-sm text-deep-navy/70">
          <li>✓ You may assist farmers with profile updates and produce listings.</li>
          <li>✓ All actions you take on behalf of farmers are recorded.</li>
          <li>✗ You cannot change a farmer&apos;s password or authentication credentials.</li>
          <li>✗ You cannot access farmers outside your assigned cooperative.</li>
          <li>✗ You cannot assign yourself as an agent or grant yourself admin access.</li>
        </ul>
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-52 rounded-xl bg-deep-navy/10" />
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-2 h-12 rounded-xl bg-deep-navy/5" />
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
