"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { cooperativeApi, type ApiError } from "@/lib/api";

type CoopStatus = "pending" | "approved" | "rejected" | "suspended";

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
  registered_by_user_id: string;
  created_at: string;
  approved_at: string | null;
}

const STATUS_STYLES: Record<CoopStatus, string> = {
  pending: "bg-harvest-gold/10 text-harvest-gold",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
};

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
];

export default function AdminCooperativesPage() {
  // Only admin users may access this page.
  const { token, loading: authLoading, error: authError } = useDashboardAuth("admin");

  const [cooperatives, setCooperatives] = useState<CooperativeData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedCoop, setSelectedCoop] = useState<CooperativeData | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [suspendNotes, setSuspendNotes] = useState("");
  const [modal, setModal] = useState<"reject" | "suspend" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = (await cooperativeApi.adminList(token!)) as {
          data: { cooperatives: CooperativeData[] };
        };
        setCooperatives(res.data.cooperatives);
      } catch (err) {
        // Ignore — authError handles 403
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    }
    void load();
  }, [token]);

  const filtered =
    statusFilter === ""
      ? cooperatives
      : cooperatives.filter((c) => c.verification_status === statusFilter);

  function updateCoopInList(updated: CooperativeData) {
    setCooperatives((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  async function handleApprove(coop: CooperativeData) {
    if (!token) return;
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = (await cooperativeApi.adminApprove(token, coop.id)) as {
        data: { cooperative: CooperativeData };
      };
      updateCoopInList(res.data.cooperative);
      setActionSuccess(`"${coop.cooperative_name}" has been approved.`);
    } catch (err) {
      setActionError((err as ApiError).message ?? "Failed to approve cooperative.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedCoop) return;
    if (!rejectNotes.trim()) {
      setActionError("Rejection notes are required.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = (await cooperativeApi.adminReject(
        token,
        selectedCoop.id,
        rejectNotes.trim(),
      )) as { data: { cooperative: CooperativeData } };
      updateCoopInList(res.data.cooperative);
      setActionSuccess(`"${selectedCoop.cooperative_name}" has been rejected.`);
      setModal(null);
      setSelectedCoop(null);
      setRejectNotes("");
    } catch (err) {
      setActionError((err as ApiError).message ?? "Failed to reject cooperative.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspendSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedCoop) return;
    if (!suspendNotes.trim()) {
      setActionError("Suspension reason is required.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
      const res = (await fetch(`${API_BASE}/cooperatives/admin/${selectedCoop.id}/suspend`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: suspendNotes.trim() }),
      }).then((r) => r.json())) as { data: { cooperative: CooperativeData } };
      updateCoopInList(res.data.cooperative);
      setActionSuccess(`"${selectedCoop.cooperative_name}" has been suspended.`);
      setModal(null);
      setSelectedCoop(null);
      setSuspendNotes("");
    } catch (err) {
      setActionError((err as ApiError).message ?? "Failed to suspend cooperative.");
    } finally {
      setActionLoading(false);
    }
  }

  function openRejectModal(coop: CooperativeData) {
    setSelectedCoop(coop);
    setRejectNotes("");
    setActionError("");
    setModal("reject");
  }

  function openSuspendModal(coop: CooperativeData) {
    setSelectedCoop(coop);
    setSuspendNotes("");
    setActionError("");
    setModal("suspend");
  }

  if (authLoading || dataLoading) {
    return <PageSkeleton />;
  }

  if (authError) {
    return <ErrorCard message={authError} />;
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Cooperative Review
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Review, approve, reject and suspend cooperative applications.
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

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              statusFilter === value
                ? "bg-agro-green text-white"
                : "border border-deep-navy/20 text-deep-navy/70 hover:border-agro-green hover:text-agro-green"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-deep-navy/50">No cooperatives found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-deep-navy/5">
            {filtered.map((coop) => (
              <li key={coop.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-deep-navy">
                        {coop.cooperative_name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[coop.verification_status]}`}
                      >
                        {coop.verification_status}
                      </span>
                    </div>

                    <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                      {coop.registration_number && (
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Reg no:</dt>
                          <dd className="text-deep-navy/70">{coop.registration_number}</dd>
                        </div>
                      )}
                      {coop.state_or_region && (
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Location:</dt>
                          <dd className="text-deep-navy/70">
                            {[coop.state_or_region, coop.country].filter(Boolean).join(", ")}
                          </dd>
                        </div>
                      )}
                      {coop.contact_email && (
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Email:</dt>
                          <dd className="text-deep-navy/70">{coop.contact_email}</dd>
                        </div>
                      )}
                      {coop.contact_phone && (
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Phone:</dt>
                          <dd className="text-deep-navy/70">{coop.contact_phone}</dd>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <dt className="text-deep-navy/40">Submitted:</dt>
                        <dd className="text-deep-navy/70">
                          {new Date(coop.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>

                    {coop.description && (
                      <p className="mt-2 text-sm text-deep-navy/60 line-clamp-2">
                        {coop.description}
                      </p>
                    )}

                    {coop.approval_notes && (
                      <p className="mt-1 text-xs text-deep-navy/50">
                        <span className="font-medium">Notes:</span> {coop.approval_notes}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 flex-col gap-2">
                    {coop.verification_status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleApprove(coop)}
                          className="rounded-full bg-agro-green px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-deep-navy disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => openRejectModal(coop)}
                          className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {coop.verification_status === "approved" && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => openSuspendModal(coop)}
                        className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reject modal */}
      {modal === "reject" && selectedCoop && (
        <Modal title="Reject Cooperative" onClose={() => setModal(null)}>
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <p className="text-sm text-deep-navy/70">
              You are about to reject{" "}
              <strong>{selectedCoop.cooperative_name}</strong>. Please provide a reason.
            </p>
            {actionError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
            <div>
              <label htmlFor="reject_notes" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                Reason for rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject_notes"
                required
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Explain why this application is being rejected…"
                className="w-full resize-y rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full border border-deep-navy/20 px-5 py-2 text-sm font-semibold text-deep-navy/70 hover:border-deep-navy/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Suspend modal */}
      {modal === "suspend" && selectedCoop && (
        <Modal title="Suspend Cooperative" onClose={() => setModal(null)}>
          <form onSubmit={handleSuspendSubmit} className="space-y-4">
            <p className="text-sm text-deep-navy/70">
              You are about to suspend{" "}
              <strong>{selectedCoop.cooperative_name}</strong>. Please provide a reason.
            </p>
            {actionError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
            <div>
              <label htmlFor="suspend_notes" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                Reason for suspension <span className="text-red-500">*</span>
              </label>
              <textarea
                id="suspend_notes"
                required
                rows={3}
                value={suspendNotes}
                onChange={(e) => setSuspendNotes(e.target.value)}
                placeholder="Explain why this cooperative is being suspended…"
                className="w-full resize-y rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full border border-deep-navy/20 px-5 py-2 text-sm font-semibold text-deep-navy/70 hover:border-deep-navy/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-full bg-gray-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
              >
                {actionLoading ? "Suspending…" : "Confirm Suspension"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-deep-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-deep-navy/40 transition-colors hover:bg-deep-navy/5 hover:text-deep-navy"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded-xl bg-deep-navy/10" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-deep-navy/10" />
        ))}
      </div>
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-deep-navy/5 p-5">
            <div className="h-5 w-48 rounded bg-deep-navy/10 mb-2" />
            <div className="h-4 w-full rounded bg-deep-navy/5" />
          </div>
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
