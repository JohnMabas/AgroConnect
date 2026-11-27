"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  adminApi,
  transporterApi,
  type AdminTransporterSummary,
  type ApiError,
  type PaginatedAdminTransporters,
} from "@/lib/api";
import { Badge, Button, Input, Pagination, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

function approvalBadge(status: string) {
  if (status === "approved") return <Badge variant="green" size="sm">Approved</Badge>;
  if (status === "pending") return <Badge variant="gold" size="sm">Pending</Badge>;
  if (status === "rejected") return <Badge variant="red" size="sm">Rejected</Badge>;
  return <Badge variant="gray" size="sm">Suspended</Badge>;
}

type ModalKind = "reject" | "suspend";

function TransportersContent() {
  const searchParams = useSearchParams();
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedAdminTransporters | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => {
    const initial = searchParams.get("status") ?? "";
    return STATUS_FILTERS.some((filter) => filter.value === initial)
      ? initial
      : "";
  });
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalKind | null>(null);
  const [selected, setSelected] = useState<AdminTransporterSummary | null>(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadTransporters = useCallback(async () => {
    if (!token) return null;
    const res = await adminApi.listTransporters(token, {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: (status || undefined) as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
        | undefined,
    });
    return res.data;
  }, [token, page, search, status]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadTransporters()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load transporters.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadTransporters]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }

  async function reload() {
    try {
      const result = await loadTransporters();
      if (result) {
        setData(result);
        setLoadError("");
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load transporters.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    refresh();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    refresh();
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPage(1);
  }

  function openModal(kind: ModalKind, transporter: AdminTransporterSummary) {
    setSelected(transporter);
    setReason("");
    setActionError("");
    setModal(kind);
  }

  async function submitReason() {
    if (!token || !selected || !modal) return;
    if (reason.trim().length < 3) {
      setActionError("A reason of at least 3 characters is required.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await adminApi.rejectTransporter(
        token,
        selected.id,
        reason.trim(),
      );
      setFeedback(res.message);
      setModal(null);
      setSelected(null);
      setReason("");
      await reload();
    } catch (err) {
      setActionError(
        (err as ApiError).message ?? "Failed to update the transporter.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function runStatusAction(
    transporter: AdminTransporterSummary,
    action: "approve" | "suspend" | "reactivate",
  ) {
    if (!token) return;
    setActionLoading(true);
    setActionError("");
    try {
      if (action === "approve") {
        await transporterApi.adminApprove(token, transporter.id);
        setFeedback(`"${transporter.business_name}" approved.`);
      } else if (action === "reactivate") {
        await transporterApi.adminReactivate(token, transporter.id);
        setFeedback(`"${transporter.business_name}" reactivated.`);
      } else {
        await transporterApi.adminSuspend(token, transporter.id, reason.trim() || undefined);
        setFeedback(`"${transporter.business_name}" suspended.`);
      }
      setModal(null);
      setSelected(null);
      setReason("");
      await reload();
    } catch (err) {
      setActionError(
        (err as ApiError).message ?? "Failed to update the transporter.",
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
          Transporters
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Review transporter applications and manage approval status.
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

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              if (value === status) return;
              refresh();
              setStatus(value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              status === value
                ? "bg-agro-green text-white"
                : "border border-deep-navy/20 text-deep-navy/70 hover:border-agro-green hover:text-agro-green"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            aria-label="Search transporters"
            placeholder="Search by business name, contact or location"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" size="md">
          Search
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={resetFilters}>
          Reset
        </Button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-deep-navy/55">
            <Spinner /> Loading transporters…
          </div>
        ) : !data || data.transporters.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No transporters found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-deep-navy/5">
              {data.transporters.map((t) => (
                <li key={t.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-deep-navy">
                          {t.business_name}
                        </h3>
                        {approvalBadge(t.approval_status)}
                      </div>
                      <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Contact:</dt>
                          <dd className="text-deep-navy/70">
                            {t.user_display_name ?? "—"} · {t.contact_phone}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Email:</dt>
                          <dd className="text-deep-navy/70">
                            {t.user_email ?? "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Base:</dt>
                          <dd className="text-deep-navy/70">
                            {t.operating_location}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Coverage:</dt>
                          <dd className="text-deep-navy/70">
                            {t.coverage_areas.length > 0
                              ? t.coverage_areas.join(", ")
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Vehicle:</dt>
                          <dd className="text-deep-navy/70">
                            {[t.vehicle_type, t.vehicle_registration_number]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Capacity:</dt>
                          <dd className="text-deep-navy/70">
                            {t.vehicle_capacity ?? "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Produce moved:</dt>
                          <dd className="text-deep-navy/70">
                            {t.produce_types.length > 0
                              ? t.produce_types.join(", ")
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Availability:</dt>
                          <dd className="capitalize text-deep-navy/70">
                            {t.availability_status.replace("_", " ")}
                          </dd>
                        </div>
                      </dl>
                      {t.suspended_reason && (
                        <p className="mt-2 text-xs text-deep-navy/50">
                          <span className="font-medium">Reason on file:</span>{" "}
                          {t.suspended_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {t.approval_status === "pending" && (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => void runStatusAction(t, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => openModal("reject", t)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {t.approval_status === "approved" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => openModal("suspend", t)}
                        >
                          Suspend
                        </Button>
                      )}
                      {(t.approval_status === "suspended" ||
                        t.approval_status === "rejected") && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => void runStatusAction(t, "reactivate")}
                        >
                          Reactivate
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
          aria-label={modal === "reject" ? "Reject transporter" : "Suspend transporter"}
          onClick={() => {
            if (!actionLoading) setModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-extrabold text-deep-navy">
              {modal === "reject"
                ? "Reject transporter application"
                : "Suspend transporter"}
            </h2>
            <p className="mt-1 text-sm text-deep-navy/60">
              {selected.business_name} · {selected.operating_location}
            </p>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="transporter-reason"
                className="mb-1.5 block text-sm font-semibold text-deep-navy"
              >
                Reason{" "}
                <span className="font-normal text-deep-navy/45">
                  (recorded in the audit log)
                </span>
              </label>
              <textarea
                id="transporter-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  modal === "reject"
                    ? "Why is this application being rejected?"
                    : "Why is this transporter being suspended?"
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
                variant="danger"
                size="sm"
                loading={actionLoading}
                onClick={() =>
                  modal === "reject"
                    ? void submitReason()
                    : void runStatusAction(selected, "suspend")
                }
              >
                {modal === "reject" ? "Reject" : "Suspend"}
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
      <div className="h-8 w-52 rounded-xl bg-deep-navy/10" />
      <div className="h-10 w-72 rounded-full bg-white shadow-sm" />
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

export default function AdminTransportersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransportersContent />
    </Suspense>
  );
}
