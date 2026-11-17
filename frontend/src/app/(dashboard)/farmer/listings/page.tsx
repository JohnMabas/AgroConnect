"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { listingsApi, type ListingData, type ApiError } from "@/lib/api";
import {
  ListingCard,
  type ListingAction,
} from "@/components/listings/listing-card";

type StatusFilter = ListingData["status"] | "all";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "sold_out", label: "Sold Out" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

const PAGE_LIMIT = 15;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FarmerListingsPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [allListings, setAllListings] = useState<ListingData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const loadListings = useCallback(async () => {
    if (!token) return;
    try {
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

  // Counts per status for tab badges
  const countByStatus = allListings.reduce<Record<string, number>>(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const filtered =
    activeTab === "all"
      ? allListings
      : allListings.filter((l) => l.status === activeTab);

  const totalPages = Math.ceil(filtered.length / PAGE_LIMIT);
  const paginated = filtered.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  function handleTabChange(tab: StatusFilter) {
    setActiveTab(tab);
    setPage(1);
  }

  async function doAction(action: ListingAction, id: string) {
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
  if (authError) return <ErrorCard message={authError} />;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            My Listings
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">
            {allListings.length} listing{allListings.length !== 1 ? "s" : ""} total
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
          New listing
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
          className="rounded-2xl border border-red-200 bg-white p-6 text-center"
        >
          <p className="text-sm text-red-700">{dataError}</p>
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

      {/* Empty — no listings at all */}
      {!dataError && allListings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/10 bg-white py-20 text-center shadow-sm">
          <span className="mb-4 text-5xl" aria-hidden="true">
            📦
          </span>
          <p className="text-lg font-semibold text-deep-navy/70">
            No listings yet
          </p>
          <p className="mt-1 text-sm text-deep-navy/50">
            Create your first listing to start selling on AgroConnect.
          </p>
          <Link
            href="/farmer/listings/create"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
          >
            Create listing →
          </Link>
        </div>
      )}

      {/* Empty tab filter */}
      {!dataError && allListings.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/8 bg-white py-14 text-center shadow-sm">
          <p className="text-sm font-semibold text-deep-navy/60">
            No listings with this status
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

      {/* Listing cards */}
      {paginated.length > 0 && (
        <ul className="space-y-4">
          {paginated.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              busy={busyId === listing.id}
              onAction={doAction}
            />
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
            {page} of {totalPages}
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

// ─── Skeleton / Error ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-deep-navy/10" />
        <div className="h-10 w-32 rounded-full bg-deep-navy/10" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-20 rounded-full bg-deep-navy/8" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm"
        >
          <div className="h-5 w-64 rounded-xl bg-deep-navy/10" />
          <div className="mt-2 h-4 w-40 rounded bg-deep-navy/5" />
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{message}</p>
      <a
        href="/login"
        className="mt-4 block text-sm font-semibold text-agro-green hover:underline"
      >
        Return to login
      </a>
    </div>
  );
}
