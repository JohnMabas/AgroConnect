"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  farmerProtectionAdminApi,
  type AdminAgentProfileData,
  type AgentProfileStatus,
  type AgentVerificationStatus,
  type ApiError,
  type PaginatedAdminAgents,
} from "@/lib/api";
import { Badge, Button, Pagination, Select, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "removed", label: "Removed" },
];

const VERIFICATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Any verification" },
  { value: "pending", label: "Verification pending" },
  { value: "approved", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

function verificationBadge(status: string) {
  if (status === "approved") return <Badge variant="green" size="sm">Verified</Badge>;
  if (status === "pending") return <Badge variant="gold" size="sm">Pending</Badge>;
  return <Badge variant="red" size="sm">Rejected</Badge>;
}

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="green" size="sm">Active</Badge>;
  if (status === "pending") return <Badge variant="gold" size="sm">Pending</Badge>;
  if (status === "suspended") return <Badge variant="red" size="sm">Suspended</Badge>;
  return <Badge variant="gray" size="sm">Removed</Badge>;
}

type ModalKind = "approve" | "reject" | "suspend";

export default function AdminAgentsPage() {
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedAdminAgents | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [status, setStatus] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalKind | null>(null);
  const [selected, setSelected] = useState<AdminAgentProfileData | null>(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

    const loadAgents = useCallback(async () => {
    if (!token) return null;
    const res = await farmerProtectionAdminApi.listAgents(token, {
      page,
      limit: PAGE_SIZE,
      status: (status || undefined) as AgentProfileStatus | undefined,
      verification_status: (verificationStatus ||
        undefined) as AgentVerificationStatus | undefined,
    });
    return res.data;
  }, [token, page, status, verificationStatus]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadAgents()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load agents.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadAgents]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }

  async function reload() {
    try {
      const result = await loadAgents();
      if (result) {
        setData(result);
        setLoadError("");
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load agents.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openModal(kind: ModalKind, agent: AdminAgentProfileData) {
    setSelected(agent);
    setReason("");
    setActionError("");
    setModal(kind);
  }

  async function submitAction() {
    if (!token || !selected || !modal) return;
    if (modal === "suspend" && reason.trim().length < 1) {
      setActionError("A suspension reason is required.");
      return;
    }
    if ((modal === "approve" || modal === "reject") && reason.trim().length > 0 && reason.trim().length < 3) {
      setActionError("Notes must be at least 3 characters, or left blank.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      if (modal === "suspend") {
        const res = await farmerProtectionAdminApi.suspendAgent(
          token,
          selected.id,
          reason.trim(),
        );
        setFeedback(res.message);
      } else {
        const res = await farmerProtectionAdminApi.verifyAgent(
          token,
          selected.id,
          modal === "approve" ? "approved" : "rejected",
          reason.trim() || undefined,
        );
        setFeedback(res.message);
      }
      setModal(null);
      setSelected(null);
      setReason("");
      await reload();
    } catch (err) {
      setActionError(
        (err as ApiError).message ?? "Failed to update the agent.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          Platform administration
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy">
          Cooperative agents
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Verify agent identities and suspend agents that breach conduct rules.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {feedback}
        </div>
      )}
      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-56">
          <Select
            aria-label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              if (e.target.value === status) return;
              refresh();
              setStatus(e.target.value);
            setPage(1);
            }}
          />
        </div>
        <div className="sm:w-56">
          <Select
            aria-label="Filter by verification"
            options={VERIFICATION_OPTIONS}
            value={verificationStatus}
            onChange={(e) => {
              if (e.target.value === verificationStatus) return;
              refresh();
              setVerificationStatus(e.target.value);
            setPage(1);
            }}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-deep-navy/55">
            <Spinner /> Loading agents…
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No agents found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-deep-navy/5">
              {data.items.map((agent) => (
                <li key={agent.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-deep-navy">
                          {agent.full_name}
                        </h3>
                        {statusBadge(agent.status)}
                        {verificationBadge(agent.verification_status)}
                      </div>
                      <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Phone:</dt>
                          <dd className="text-deep-navy/70">
                            {agent.phone_number}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Email:</dt>
                          <dd className="text-deep-navy/70">
                            {agent.email ?? "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Operating area:</dt>
                          <dd className="text-deep-navy/70">
                            {agent.operating_area ?? "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Code of conduct:</dt>
                          <dd className="text-deep-navy/70">
                            {agent.code_of_conduct_version
                              ? `${agent.code_of_conduct_version}${
                                  agent.code_of_conduct_accepted_at
                                    ? " · accepted"
                                    : ""
                                }`
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Joined:</dt>
                          <dd className="text-deep-navy/70">
                            {new Date(agent.created_at).toLocaleDateString()}
                          </dd>
                        </div>
                        {agent.verified_at && (
                          <div className="flex gap-1.5">
                            <dt className="text-deep-navy/40">Verified:</dt>
                            <dd className="text-deep-navy/70">
                              {new Date(agent.verified_at).toLocaleDateString()}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {agent.verification_status === "pending" && (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => openModal("approve", agent)}
                          >
                            Verify
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => openModal("reject", agent)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {agent.status === "active" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => openModal("suspend", agent)}
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-deep-navy/10 px-5 py-4">
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                onPageChange={(next) => {
                  if (next === page) return;
                  refresh();
                  setPage(next);
                }}
              />
            </div>
          </>
        )}
      </section>

      {modal && selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${modal} agent`}
          onClick={() => {
            if (!actionLoading) setModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-extrabold text-deep-navy">
              {modal === "approve"
                ? "Verify agent"
                : modal === "reject"
                  ? "Reject agent verification"
                  : "Suspend agent"}
            </h2>
            <p className="mt-1 text-sm text-deep-navy/60">
              {selected.full_name} · {selected.phone_number}
            </p>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="agent-reason"
                className="mb-1.5 block text-sm font-semibold text-deep-navy"
              >
                {modal === "approve" ? "Notes" : "Reason"}{" "}
                <span className="font-normal text-deep-navy/45">
                  {modal === "approve" ? "(optional)" : "(recorded in the audit log)"}
                </span>
              </label>
              <textarea
                id="agent-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  modal === "approve"
                    ? "Optional verification notes"
                    : modal === "reject"
                      ? "Why is this verification being rejected?"
                      : "Why is this agent being suspended?"
                }
                className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={actionLoading}
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={modal === "reject" || modal === "suspend" ? "danger" : "primary"}
                size="sm"
                loading={actionLoading}
                onClick={() => void submitAction()}
              >
                {modal === "approve"
                  ? "Verify"
                  : modal === "reject"
                    ? "Reject"
                    : "Suspend"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-xl bg-deep-navy/10" />
      <div className="h-96 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}
