"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { listingsApi, type ListingData, type ApiError } from "@/lib/api";
import {
  ListingCard,
  type ListingAction,
} from "@/components/listings/listing-card";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FarmerListingsPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [listings, setListings] = useState<ListingData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = await listingsApi.getMe(token!);
        setListings(res.data.listings ?? []);
      } catch (err) {
        setDataError((err as ApiError).message ?? "Failed to load listings.");
      } finally {
        setDataLoading(false);
      }
    }
    void load();
  }, [token]);

  async function doAction(action: ListingAction, id: string) {
    if (!token) return;
    setBusyId(id);
    setActionError("");
    try {
      if (action === "delete") {
        await listingsApi.delete(token, id);
        setListings((prev) => prev.filter((l) => l.id !== id));
        return;
      }
      const res = (await listingsApi[action](token, id)) as {
        data: { listing: ListingData };
      };
      const updated = res.data.listing;
      setListings((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)),
      );
    } catch (err) {
      setActionError((err as ApiError).message ?? `Failed to ${action} listing.`);
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || dataLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            My Listings
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">
            Manage your produce listings.
          </p>
        </div>
        <Link
          href="/farmer/listings/create"
          className="shrink-0 inline-flex items-center gap-2 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy"
        >
          + New listing
        </Link>
      </div>

      {/* Action error */}
      {actionError && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Data error */}
      {dataError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm text-red-700">{dataError}</p>
        </div>
      )}

      {/* Empty */}
      {!dataError && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/10 bg-white py-20 text-center shadow-sm">
          <span className="mb-4 text-5xl" aria-hidden="true">📦</span>
          <p className="text-lg font-semibold text-deep-navy/70">
            No listings yet
          </p>
          <p className="mt-1 text-sm text-deep-navy/50">
            Create your first listing to start selling on AgroConnect.
          </p>
          <Link
            href="/farmer/listings/create"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-deep-navy transition-colors"
          >
            Create listing →
          </Link>
        </div>
      )}

      {/* Listing cards */}
      {listings.length > 0 && (
        <ul className="space-y-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              busy={busyId === listing.id}
              onAction={doAction}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Skeleton / Error ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-deep-navy/10" />
        <div className="h-10 w-32 rounded-full bg-deep-navy/10" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
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
      <a href="/login" className="mt-4 block text-sm font-semibold text-agro-green hover:underline">
        Return to login
      </a>
    </div>
  );
}
