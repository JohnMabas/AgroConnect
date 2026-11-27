"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  adminApi,
  toArray,
  type AdminListingSummary,
  type ApiError,
  type PaginatedAdminListings,
} from "@/lib/api";
import { Badge, Button, Input, Pagination, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "sold_out", label: "Sold out" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

function statusBadge(status: string) {
  switch (status) {
    case "published":
      return <Badge variant="green" size="sm">Published</Badge>;
    case "paused":
      return <Badge variant="gold" size="sm">Paused</Badge>;
    case "sold_out":
      return <Badge variant="navy" size="sm">Sold out</Badge>;
    case "draft":
      return <Badge variant="gray" size="sm">Draft</Badge>;
    case "closed":
      return <Badge variant="gray" size="sm">Closed</Badge>;
    default:
      return <Badge variant="gray" size="sm">{status}</Badge>;
  }
}

export default function AdminListingsPage() {
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedAdminListings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<"hide" | "restore" | null>(null);
  const [selected, setSelected] = useState<AdminListingSummary | null>(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

    const loadListings = useCallback(async () => {
    if (!token) return null;
    const res = await adminApi.listListings(token, {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: (status || undefined) as AdminListingSummary["status"] | undefined,
    });
    return res.data;
  }, [token, page, search, status]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadListings()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load listings.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadListings]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }

  async function reload() {
    try {
      const result = await loadListings();
      if (result) {
        setData(result);
        setLoadError("");
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load listings.",
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

  function openModal(kind: "hide" | "restore", listing: AdminListingSummary) {
    setSelected(listing);
    setReason("");
    setActionError("");
    setModal(kind);
  }

  async function submitModeration() {
    if (!token || !selected || !modal) return;
    if (reason.trim().length < 3) {
      setActionError("A moderation reason of at least 3 characters is required.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await adminApi.moderateListing(
        token,
        selected.id,
        modal,
        reason.trim(),
      );
      setFeedback(res.message);
      setModal(null);
      setSelected(null);
      setReason("");
      await reload();
    } catch (err) {
      setActionError(
        (err as ApiError).message ?? "Failed to moderate the listing.",
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
          Listings
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Moderate produce listings across the whole marketplace.
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
              if (status === value) return;
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
            aria-label="Search listings"
            placeholder="Search by listing title or farmer name"
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
            <Spinner /> Loading listings…
          </div>
        ) : !data || toArray(data.listings).length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No listings found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-deep-navy/5">
              {toArray(data.listings).map((listing) => (
                <li key={listing.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-deep-navy">
                          {listing.title}
                        </h3>
                        {statusBadge(listing.status)}
                      </div>
                      <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Farmer:</dt>
                          <dd className="text-deep-navy/70">
                            {listing.farmer_display_name ?? "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Produce:</dt>
                          <dd className="text-deep-navy/70">
                            {listing.produce_type_name ?? "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Quantity:</dt>
                          <dd className="text-deep-navy/70">
                            {listing.available_quantity} / {listing.quantity}{" "}
                            {listing.unit} available
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Price:</dt>
                          <dd className="text-deep-navy/70">
                            {listing.currency}{" "}
                            {listing.price_per_unit.toFixed(2)} per{" "}
                            {listing.unit}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Location:</dt>
                          <dd className="text-deep-navy/70">
                            {[listing.community, listing.state_or_region]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-deep-navy/40">Updated:</dt>
                          <dd className="text-deep-navy/70">
                            {new Date(listing.updated_at).toLocaleDateString()}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {listing.status === "published" ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => openModal("hide", listing)}
                        >
                          Hide listing
                        </Button>
                      ) : listing.status === "paused" ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => openModal("restore", listing)}
                        >
                          Restore listing
                        </Button>
                      ) : null}
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
          aria-label={modal === "hide" ? "Hide listing" : "Restore listing"}
          onClick={() => {
            if (!actionLoading) setModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-extrabold text-deep-navy">
              {modal === "hide" ? "Hide listing" : "Restore listing"}
            </h2>
            <p className="mt-1 text-sm text-deep-navy/60">
              {selected.title} · {selected.farmer_display_name ?? "Unknown farmer"}
            </p>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="moderation-reason"
                className="mb-1.5 block text-sm font-semibold text-deep-navy"
              >
                Reason{" "}
                <span className="font-normal text-deep-navy/45">
                  (recorded in the audit log)
                </span>
              </label>
              <textarea
                id="moderation-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  modal === "hide"
                    ? "Why is this listing being hidden?"
                    : "Why is this listing being restored?"
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
                variant={modal === "hide" ? "danger" : "primary"}
                size="sm"
                loading={actionLoading}
                onClick={() => void submitModeration()}
              >
                {modal === "hide" ? "Hide" : "Restore"}
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
      <div className="h-8 w-44 rounded-xl bg-deep-navy/10" />
      <div className="h-10 w-96 rounded-full bg-white shadow-sm" />
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
