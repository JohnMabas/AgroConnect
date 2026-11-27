"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  farmerProtectionAdminApi,
  type AdminComplaintData,
  type AdminComplaintDetail,
  type ApiError,
  type FarmerComplaintPriority,
  type FarmerComplaintStatus,
  type PaginatedAdminComplaints,
} from "@/lib/api";
import { Badge, Button, Input, Pagination, Select, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "under_review", label: "Under review" },
  { value: "awaiting_information", label: "Awaiting information" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

const PRIORITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const UPDATE_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "acknowledged", label: "Acknowledge" },
  { value: "under_review", label: "Start review" },
  { value: "awaiting_information", label: "Awaiting information" },
  { value: "escalated", label: "Escalate" },
  { value: "resolved", label: "Resolve" },
  { value: "dismissed", label: "Dismiss" },
];

function statusBadge(status: string) {
  if (status === "resolved" || status === "dismissed") {
    return <Badge variant="green" size="sm">{status.replace("_", " ")}</Badge>;
  }
  if (status === "escalated") return <Badge variant="red" size="sm">Escalated</Badge>;
  if (status === "submitted") return <Badge variant="gold" size="sm">Submitted</Badge>;
  return <Badge variant="navy" size="sm">{status.replace("_", " ")}</Badge>;
}

function priorityBadge(priority: string) {
  if (priority === "urgent") return <Badge variant="red" size="sm">Urgent</Badge>;
  if (priority === "high") return <Badge variant="gold" size="sm">High</Badge>;
  return <Badge variant="gray" size="sm">{priority}</Badge>;
}

export default function AdminComplaintsPage() {
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedAdminComplaints | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<AdminComplaintDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [resolution, setResolution] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

    const loadComplaints = useCallback(async () => {
    if (!token) return null;
    const res = await farmerProtectionAdminApi.listComplaints(token, {
      page,
      limit: PAGE_SIZE,
      status: (status || undefined) as FarmerComplaintStatus | undefined,
    });
    return res.data;
  }, [token, page, status]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadComplaints()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load complaints.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadComplaints]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }

  async function reload() {
    try {
      const result = await loadComplaints();
      if (result) {
        setData(result);
        setLoadError("");
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load complaints.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(complaint: AdminComplaintData) {
    if (!token) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await farmerProtectionAdminApi.getComplaint(token, complaint.id);
      setDetail(res.data.complaint);
    } catch (err) {
      setLoadError(
        (err as ApiError).message ?? "Failed to load the complaint.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function openUpdate() {
    if (!detail) return;
    setNewStatus("");
    setNewPriority("");
    setResolution(detail.resolution ?? "");
    setActionError("");
    setModal(true);
  }

  async function submitUpdate(e: FormEvent) {
    e.preventDefault();
    if (!token || !detail) return;
    if (!newStatus && !newPriority && !resolution.trim()) {
      setActionError("Choose a status, priority, or enter a resolution.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await farmerProtectionAdminApi.updateComplaint(token, detail.id, {
        status: (newStatus || undefined) as FarmerComplaintStatus | undefined,
        priority: (newPriority || undefined) as FarmerComplaintPriority | undefined,
        resolution: resolution.trim() || undefined,
        notes: resolution.trim() || undefined,
      });
      setFeedback(res.message);
      setModal(false);
      const refreshed = await farmerProtectionAdminApi.getComplaint(
        token,
        detail.id,
      );
      setDetail(refreshed.data.complaint);
      await reload();
    } catch (err) {
      setActionError(
        (err as ApiError).message ?? "Failed to update the complaint.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = data
    ? {
        ...data,
        items: searchInput.trim()
          ? data.items.filter((c) => {
              const term = searchInput.trim().toLowerCase();
              return (
                c.complaint_number.toLowerCase().includes(term) ||
                c.description.toLowerCase().includes(term) ||
                c.category.toLowerCase().includes(term)
              );
            })
          : data.items,
      }
    : null;

  if (authLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          Platform administration
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy">
          Farmer complaints
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Review complaints raised by farmers and record investigation outcomes.
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
        <div className="sm:w-64">
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
        <div className="flex-1">
          <Input
            aria-label="Search complaints"
            placeholder="Search this page by number, category or description"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-deep-navy/55">
            <Spinner /> Loading complaints…
          </div>
        ) : !filtered || filtered.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No complaints found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-deep-navy/5">
              {filtered.items.map((complaint) => (
                <li key={complaint.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-deep-navy">
                          {complaint.complaint_number}
                        </h3>
                        {statusBadge(complaint.status)}
                        {priorityBadge(complaint.priority)}
                        <Badge variant="navy" size="sm">
                          {complaint.category.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-deep-navy/65">
                        {complaint.description}
                      </p>
                      <p className="mt-1 text-xs text-deep-navy/50">
                        Raised {new Date(complaint.created_at).toLocaleString()}
                        {typeof complaint.evidence_count === "number" &&
                          complaint.evidence_count > 0 &&
                          ` · ${complaint.evidence_count} evidence file(s)`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openDetail(complaint)}
                    >
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-deep-navy/10 px-5 py-4">
              <Pagination
                page={data!.page}
                totalPages={data!.total_pages}
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

      {(detailLoading || detail) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Complaint details"
          onClick={() => {
            if (!detailLoading && !modal) setDetail(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-3 py-10 text-sm text-deep-navy/55">
                <Spinner /> Loading complaint…
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-lg font-extrabold text-deep-navy">
                      {detail.complaint_number}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {statusBadge(detail.status)}
                      {priorityBadge(detail.priority)}
                      <Badge variant="navy" size="sm">
                        {detail.category.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    aria-label="Close"
                    className="rounded-full p-2 text-deep-navy/40 transition-colors hover:bg-soft-bg hover:text-deep-navy"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-line text-sm text-deep-navy/70">
                  {detail.description}
                </p>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Raised</dt>
                    <dd>{new Date(detail.created_at).toLocaleString()}</dd>
                  </div>
                  {detail.resolved_at && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-deep-navy/50">Closed</dt>
                      <dd>{new Date(detail.resolved_at).toLocaleString()}</dd>
                    </div>
                  )}
                  {detail.resolution && (
                    <div className="rounded-xl bg-soft-bg px-3 py-2">
                      <dt className="text-xs font-semibold text-deep-navy/60">
                        Resolution
                      </dt>
                      <dd className="mt-1 text-sm text-deep-navy/75">
                        {detail.resolution}
                      </dd>
                    </div>
                  )}
                </dl>

                {detail.evidence && detail.evidence.length > 0 && (
                  <div className="mt-4 border-t border-deep-navy/10 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                      Evidence
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {detail.evidence.map((file) => (
                        <li
                          key={file.id}
                          className="rounded-xl bg-soft-bg px-3 py-2 text-xs text-deep-navy/70"
                        >
                          {file.file_name} · {file.file_type}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.investigations && detail.investigations.length > 0 && (
                  <div className="mt-4 border-t border-deep-navy/10 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                      Investigation history
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {detail.investigations.map((note) => (
                        <li key={note.id} className="rounded-xl bg-soft-bg px-3 py-2 text-xs">
                          <p className="font-semibold text-deep-navy">
                            {note.action}
                            {note.decision ? ` · ${note.decision}` : ""}
                          </p>
                          {note.notes && (
                            <p className="mt-0.5 text-deep-navy/70">{note.notes}</p>
                          )}
                          <p className="mt-0.5 text-deep-navy/45">
                            {new Date(note.created_at).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-2 border-t border-deep-navy/10 pt-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={openUpdate}
                  >
                    Update complaint
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modal && detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Update complaint"
          onClick={() => {
            if (!actionLoading) setModal(false);
          }}
        >
          <form
            onSubmit={submitUpdate}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-extrabold text-deep-navy">
              Update complaint
            </h2>
            <p className="mt-1 text-sm text-deep-navy/60">
              {detail.complaint_number}
            </p>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <Select
                label="New status"
                options={[{ value: "", label: "Keep current status" }, ...UPDATE_STATUS_OPTIONS]}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              />
              <Select
                label="Priority"
                options={[{ value: "", label: "Keep current priority" }, ...PRIORITY_OPTIONS]}
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              />
              <div>
                <label
                  htmlFor="complaint-resolution"
                  className="mb-1.5 block text-sm font-semibold text-deep-navy"
                >
                  Resolution{" "}
                  <span className="font-normal text-deep-navy/45">(optional)</span>
                </label>
                <textarea
                  id="complaint-resolution"
                  rows={4}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Outcome, decision or notes for the record"
                  className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={actionLoading}
                onClick={() => setModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={actionLoading}
              >
                Save update
              </Button>
            </div>
          </form>
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
