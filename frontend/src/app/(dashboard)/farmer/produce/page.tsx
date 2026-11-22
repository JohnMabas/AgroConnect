"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  listingsApi,
  mediaUrl,
  type ListingData,
  type ApiError,
} from "@/lib/api";
import { cardImageUrl } from "@/lib/cloudinary";
import { ListingImage } from "@/components/listings/listing-image";

// ─── Types / constants ────────────────────────────────────────────────────────

type ListingStatus = ListingData["status"] | "all";

const STATUS_TABS: { value: ListingStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "sold_out", label: "Sold Out" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

const STATUS_LABEL: Record<ListingData["status"], string> = {
  published: "Active",
  paused: "Paused",
  draft: "Draft",
  sold_out: "Sold Out",
  closed: "Closed",
  expired: "Expired",
};

const STATUS_BADGE: Record<ListingData["status"], string> = {
  published: "bg-fresh-green/15 text-agro-green",
  paused: "bg-harvest-gold/15 text-amber-700",
  draft: "bg-deep-navy/8 text-deep-navy/55",
  sold_out: "bg-red-50 text-red-600",
  closed: "bg-deep-navy/8 text-deep-navy/45",
  expired: "bg-red-50/50 text-red-500",
};

const PAGE_LIMIT = 20;

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

// ─── Produce Card ─────────────────────────────────────────────────────────────

interface ProduceCardProps {
  listing: ListingData;
  busy: boolean;
  onAction: (action: "publish" | "pause" | "resume" | "close" | "delete", id: string) => void;
}

function ProduceCard({ listing, busy, onAction }: ProduceCardProps) {
  const primary =
    listing.images?.find((img) => img.is_primary) ?? listing.images?.[0];
  const status = listing.status;

  const availPct =
    listing.quantity > 0
      ? Math.min(
          100,
          Math.round((listing.available_quantity / listing.quantity) * 100),
        )
      : 0;

  return (
    <article className="rounded-2xl border border-deep-navy/8 bg-white shadow-sm transition-shadow hover:shadow-md hover:shadow-deep-navy/5">
      <div className="flex flex-col gap-0 sm:flex-row">
        {/* Image */}
        <div className="h-36 w-full shrink-0 overflow-hidden rounded-t-2xl sm:h-auto sm:w-28 sm:rounded-l-2xl sm:rounded-tr-none">
          {primary ? (
            <ListingImage
              src={cardImageUrl(mediaUrl(primary.image_url))}
              alt={listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-soft-bg text-4xl"
              aria-hidden="true"
            >
              🌾
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
                {listing.produce_type && (
                  <span className="rounded-full bg-agro-green/8 px-2.5 py-0.5 text-[11px] font-semibold text-agro-green">
                    {listing.produce_type.name}
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 font-heading text-base font-bold text-deep-navy">
                {listing.title}
              </h3>
              <p className="mt-0.5 text-sm font-semibold text-agro-green">
                {formatMoney(listing.price_per_unit, listing.currency)}{" "}
                <span className="font-normal text-deep-navy/50">/ {listing.unit}</span>
              </p>
            </div>
          </div>

          {/* Inventory summary */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-deep-navy/8 bg-soft-bg px-2 py-1.5">
              <p className="text-deep-navy/50">Available</p>
              <p className="mt-0.5 font-bold text-deep-navy">
                {Number(listing.available_quantity).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-deep-navy/8 bg-soft-bg px-2 py-1.5">
              <p className="text-deep-navy/50">Reserved</p>
              <p className="mt-0.5 font-bold text-harvest-gold">
                {Number(listing.reserved_quantity).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-deep-navy/8 bg-soft-bg px-2 py-1.5">
              <p className="text-deep-navy/50">Sold</p>
              <p className="mt-0.5 font-bold text-agro-green">
                {Number(listing.sold_quantity).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Availability bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-deep-navy/45">
              <span>{listing.unit}</span>
              <span>{availPct}% available</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-soft-bg">
              <div
                className="h-full rounded-full bg-fresh-green"
                style={{ width: `${availPct}%` }}
                role="presentation"
              />
            </div>
          </div>

          {/* Location & date */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-deep-navy/45">
            {listing.state_or_region && (
              <span className="flex items-center gap-1">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {listing.local_government_area
                  ? `${listing.local_government_area}, ${listing.state_or_region}`
                  : listing.state_or_region}
              </span>
            )}
            <span>Added {formatDate(listing.created_at)}</span>
            {listing.updated_at !== listing.created_at && (
              <span>Updated {formatDate(listing.updated_at)}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Edit — only for draft and paused */}
            {(status === "draft" || status === "paused" || status === "published") && (
              <Link
                href={`/farmer/listings/${listing.id}/edit`}
                className="rounded-full border border-deep-navy/20 px-3.5 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
              >
                Edit
              </Link>
            )}
            {/* View in marketplace */}
            {status === "published" && (
              <Link
                href={`/marketplace/${listing.id}`}
                className="rounded-full border border-agro-green/25 px-3.5 py-1.5 text-xs font-semibold text-agro-green transition-colors hover:bg-agro-green/8"
                target="_blank"
                rel="noopener noreferrer"
              >
                View in marketplace
              </Link>
            )}
            {/* Inventory */}
            <Link
              href="/farmer/inventory"
              className="rounded-full border border-deep-navy/20 px-3.5 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
            >
              Inventory
            </Link>
            {/* Publish */}
            {status === "draft" && (
              <ActionButton
                label="Publish"
                busy={busy}
                className="bg-agro-green text-white hover:bg-deep-navy"
                onClick={() => onAction("publish", listing.id)}
              />
            )}
            {/* Pause */}
            {status === "published" && (
              <ActionButton
                label="Pause"
                busy={busy}
                className="border border-harvest-gold/30 bg-harvest-gold/10 text-amber-700 hover:bg-harvest-gold/20"
                onClick={() => onAction("pause", listing.id)}
              />
            )}
            {/* Resume */}
            {status === "paused" && (
              <ActionButton
                label="Resume"
                busy={busy}
                className="bg-agro-green text-white hover:bg-deep-navy"
                onClick={() => onAction("resume", listing.id)}
              />
            )}
            {/* Close */}
            {(status === "published" || status === "paused") && (
              <ActionButton
                label="Close"
                busy={busy}
                className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                onClick={() => {
                  if (confirm(`Close listing "${listing.title}"? Buyers will no longer see it.`)) {
                    onAction("close", listing.id);
                  }
                }}
              />
            )}
            {/* Delete */}
            {status === "draft" && (
              <ActionButton
                label="Delete"
                busy={busy}
                className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                onClick={() => {
                  if (confirm(`Permanently delete "${listing.title}"?`)) {
                    onAction("delete", listing.id);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  label,
  busy,
  className,
  onClick,
}: {
  label: string;
  busy: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? "…" : label}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
        <div className="h-10 w-36 rounded-full bg-deep-navy/10" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-20 rounded-full bg-deep-navy/8" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 rounded-2xl bg-white shadow-sm" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FarmerProducePage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [allListings, setAllListings] = useState<ListingData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ListingStatus>("all");

  // Simple client-side pagination over loaded listings
  const [page, setPage] = useState(1);

  const loadListings = useCallback(async () => {
    if (!token) return;
    try {
      // Load up to 100 — farmer typically has relatively few listings
      const res = await listingsApi.getMe(token, 1, 100);
      setAllListings(res.data.listings ?? []);
    } catch (err) {
      setDataError((err as ApiError).message ?? "Failed to load listings.");
    } finally {
      setDataLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  // Filter by status tab
  const filtered =
    activeTab === "all"
      ? allListings
      : allListings.filter((l) => l.status === activeTab);

  // Client-side pagination of filtered results
  const totalPages = Math.ceil(filtered.length / PAGE_LIMIT);
  const paginated = filtered.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  // Reset page when tab changes
  const handleTabChange = (tab: ListingStatus) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Counts per status for tab badges
  const countByStatus = allListings.reduce<Record<string, number>>(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  async function doAction(
    action: "publish" | "pause" | "resume" | "close" | "delete",
    id: string,
  ) {
    if (!token) return;
    setBusyId(id);
    setActionError("");
    try {
      if (action === "delete") {
        await listingsApi.delete(token, id);
        setAllListings((prev) => prev.filter((l) => l.id !== id));
        return;
      }
      const res = (await listingsApi[action](token, id)) as {
        data: { listing: ListingData };
      };
      const updated = res.data.listing;
      setAllListings((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)),
      );
    } catch (err) {
      setActionError(
        (err as ApiError).message ?? `Failed to ${action} listing.`,
      );
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || dataLoading) return <PageSkeleton />;

  if (authError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">{authError}</p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-semibold text-agro-green hover:underline"
        >
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            My Produce
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">
            Manage your produce listings, inventory and status.
          </p>
        </div>
        <Link
          href="/farmer/listings/create"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add produce
        </Link>
      </div>

      {/* Action error */}
      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* Data error */}
      {dataError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-white px-4 py-3 text-center text-sm text-red-700"
        >
          {dataError}
        </div>
      )}

      {/* Status tabs */}
      {!dataError && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? allListings.length
                  : (countByStatus[tab.value] ?? 0);
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                    activeTab === tab.value
                      ? "bg-agro-green text-white shadow-sm"
                      : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                        activeTab === tab.value
                          ? "bg-white/25 text-white"
                          : "bg-deep-navy/8 text-deep-navy/60"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty */}
      {!dataError && allListings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/8 bg-white py-20 text-center shadow-sm">
          <span className="mb-4 text-5xl" aria-hidden="true">
            🌱
          </span>
          <p className="font-heading text-lg font-semibold text-deep-navy/70">
            No produce listed yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-deep-navy/50">
            Create your first produce listing to start selling on AgroConnect.
            Buyers will be able to discover your produce in the marketplace.
          </p>
          <Link
            href="/farmer/listings/create"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
          >
            Create first listing →
          </Link>
        </div>
      )}

      {/* Empty tab */}
      {!dataError && allListings.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/8 bg-white py-16 text-center shadow-sm">
          <p className="text-sm font-semibold text-deep-navy/60">
            No{" "}
            {activeTab === "all"
              ? "listings"
              : STATUS_LABEL[activeTab as ListingData["status"]]?.toLowerCase()}{" "}
            listings
          </p>
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className="mt-3 text-xs font-semibold text-agro-green hover:underline"
          >
            View all listings
          </button>
        </div>
      )}

      {/* Cards */}
      {paginated.length > 0 && (
        <ul className="space-y-4" role="list">
          {paginated.map((listing) => (
            <li key={listing.id}>
              <ProduceCard
                listing={listing}
                busy={busyId === listing.id}
                onAction={doAction}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-deep-navy/50">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
