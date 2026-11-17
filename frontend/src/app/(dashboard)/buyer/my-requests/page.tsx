"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { buyerRequestsApi, type BuyerRequestData, type ApiError } from "@/lib/api";

type StatusFilter = BuyerRequestData["status"] | "all";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "paused", label: "Paused" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const STATUS_BADGE: Record<string, string> = {
  open: "bg-fresh-green/15 text-agro-green",
  paused: "bg-harvest-gold/15 text-amber-700",
  fulfilled: "bg-deep-navy/8 text-deep-navy/55",
  cancelled: "bg-red-50 text-red-600",
  expired: "bg-deep-navy/6 text-deep-navy/40",
};

function formatDate(v: string | null) {
  if (!v) return null;
  try { return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(`${v}T00:00:00`)); }
  catch { return v; }
}

function formatMoney(v: number, c: string) {
  if (c === "NGN") return `₦${v.toLocaleString()}`;
  return `${c} ${v.toLocaleString()}`;
}

function getProduceName(r: BuyerRequestData) {
  return r.produce_type?.name ?? r.produce_category?.name ?? "Agricultural produce";
}

function ActionBtn({ label, busy, onClick, variant = "default" }: {
  label: string; busy: boolean; onClick: () => void; variant?: "default" | "danger" | "primary";
}) {
  const cls = {
    default: "border border-deep-navy/20 text-deep-navy/60 hover:bg-deep-navy/5",
    danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    primary: "bg-agro-green text-white hover:bg-deep-navy",
  }[variant];
  return (
    <button type="button" disabled={busy} onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}>
      {busy ? "…" : label}
    </button>
  );
}

export default function MyRequestsPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();
  const [all, setAll] = useState<BuyerRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await buyerRequestsApi.getMyRequests(token, { limit: 100 });
      setAll(res.data.requests ?? []);
    } catch (err) {
      setDataError((err as ApiError).message ?? "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const counts = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
  }, {});

  const filtered = tab === "all" ? all : all.filter((r) => r.status === tab);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function doAction(action: "pause" | "reopen" | "fulfill" | "cancel", id: string) {
    if (!token) return;
    if ((action === "fulfill" || action === "cancel") &&
      !confirm(action === "fulfill" ? "Mark as fulfilled?" : "Cancel this request?")) return;
    setBusyId(id); setActionError("");
    try {
      const res = await buyerRequestsApi[action](token, id);
      setAll((prev) => prev.map((r) => r.id === id ? res.data.request : r));
    } catch (err) {
      setActionError((err as ApiError).message ?? `Failed to ${action}.`);
    } finally { setBusyId(null); }
  }

  if (authLoading || loading) return <Skeleton />;
  if (authError) return <ErrCard msg={authError} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">My Requests</h1>
          <p className="mt-1 text-sm text-deep-navy/60">{all.length} request{all.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/buyer-requests/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy">
          + New Request
        </Link>
      </div>

      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}
      {dataError && <div role="alert" className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">{dataError}</div>}

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm">
          {TABS.map((t) => {
            const cnt = t.value === "all" ? all.length : (counts[t.value] ?? 0);
            return (
              <button key={t.value} type="button"
                onClick={() => { setTab(t.value); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${tab === t.value ? "bg-agro-green text-white shadow-sm" : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"}`}>
                {t.label}
                {cnt > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${tab === t.value ? "bg-white/25 text-white" : "bg-deep-navy/8 text-deep-navy/60"}`}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {all.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/8 bg-white py-20 text-center shadow-sm">
          <span className="mb-4 text-5xl" aria-hidden="true">📋</span>
          <p className="font-heading text-lg font-semibold text-deep-navy/70">No requests yet</p>
          <p className="mt-1 max-w-sm text-sm text-deep-navy/50">Post your first buyer request and farmers will respond with offers.</p>
          <Link href="/buyer-requests/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy">Post first request →</Link>
        </div>
      )}

      {all.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/8 bg-white py-14 text-center shadow-sm">
          <p className="text-sm font-semibold text-deep-navy/60">No {tab} requests</p>
          <button type="button" onClick={() => setTab("all")} className="mt-3 text-xs font-semibold text-agro-green hover:underline">View all</button>
        </div>
      )}

      {paged.length > 0 && (
        <ul className="space-y-4">
          {paged.map((r) => {
            const busy = busyId === r.id;
            const loc = [r.community, r.local_government_area, r.state_or_region].filter(Boolean).join(", ");
            return (
              <li key={r.id} className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status] ?? ""}`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-heading text-base font-bold text-deep-navy">{getProduceName(r)}</h3>
                    <p className="mt-0.5 text-sm text-deep-navy/70">
                      <strong>{Number(r.requested_quantity).toLocaleString()} {r.unit}</strong>
                      {r.target_price_per_unit ? ` · Target: ${formatMoney(r.target_price_per_unit, r.currency)}/${r.unit}` : " · Open to offers"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-deep-navy/50">
                      {loc && <span>{loc}</span>}
                      {r.required_delivery_date && <span>Needs by {formatDate(r.required_delivery_date)}</span>}
                      <span>Expires {formatDate(r.expiry_date)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/buyer-requests/${r.id}`}
                      className="rounded-full border border-deep-navy/20 px-3.5 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5">
                      View
                    </Link>
                    {(r.status === "open" || r.status === "paused") && (
                      <Link href={`/buyer-requests/${r.id}/edit`}
                        className="rounded-full border border-deep-navy/20 px-3.5 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5">
                        Edit
                      </Link>
                    )}
                    {r.status === "open" && <ActionBtn label="Pause" busy={busy} onClick={() => void doAction("pause", r.id)} />}
                    {r.status === "paused" && <ActionBtn label="Reopen" busy={busy} variant="primary" onClick={() => void doAction("reopen", r.id)} />}
                    {(r.status === "open" || r.status === "paused") && (
                      <>
                        <ActionBtn label="Fulfill" busy={busy} variant="primary" onClick={() => void doAction("fulfill", r.id)} />
                        <ActionBtn label="Cancel" busy={busy} variant="danger" onClick={() => void doAction("cancel", r.id)} />
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40">
            ← Previous
          </button>
          <span className="text-xs text-deep-navy/50">{page} of {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
        <div className="h-10 w-36 rounded-full bg-deep-navy/10" />
      </div>
      <div className="flex gap-2">{[1,2,3,4].map((i) => <div key={i} className="h-9 w-24 rounded-full bg-deep-navy/8" />)}</div>
      {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />)}
    </div>
  );
}

function ErrCard({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{msg}</p>
      <a href="/login" className="mt-4 block text-sm font-semibold text-agro-green hover:underline">Return to login</a>
    </div>
  );
}
