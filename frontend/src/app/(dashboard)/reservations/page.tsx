"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CardSkeleton, LineSkeleton } from "@/components/dashboard/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/ui";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  ApiError,
  reservationsApi,
  type OrderReservationData,
  type PaginatedReservationsData,
  type ReservationStatus,
} from "@/lib/api";

type StatusTab = ReservationStatus | "all";

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<ReservationStatus, string> = {
  active: "Active",
  released: "Released",
  expired: "Expired",
  consumed: "Consumed",
  void: "Void",
};

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "released", label: "Released" },
  { value: "expired", label: "Expired" },
  { value: "consumed", label: "Consumed" },
  { value: "void", label: "Void" },
];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusBadgeClass(status: ReservationStatus): string {
  if (status === "active") return "bg-fresh-green/15 text-agro-green";
  if (status === "released" || status === "void") return "bg-deep-navy/8 text-deep-navy/60";
  return "bg-red-50 text-red-600";
}

function ReservationCard({ reservation }: { reservation: OrderReservationData }) {
  const expired = reservation.is_expired || reservation.status === "expired";
  return (
    <li className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/45">
            Reservation {reservation.id.slice(0, 8)}
          </p>
          <p className="mt-1 truncate font-heading text-base font-bold text-deep-navy">
            Listing {reservation.listing_id.slice(0, 8)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(reservation.status)}`}>
          {STATUS_LABEL[reservation.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-deep-navy/70 sm:grid-cols-2">
        <p>
          <span className="font-semibold text-deep-navy">Quantity:</span>{" "}
          {reservation.quantity.toLocaleString()}
        </p>
        <p>
          <span className="font-semibold text-deep-navy">Expiry:</span>{" "}
          {formatDateTime(reservation.expires_at)}
        </p>
      </div>

      {expired && (
        <p className="mt-3 text-xs font-semibold text-red-600" role="status">
          This reservation has expired.
        </p>
      )}
      {reservation.released_at && (
        <p className="mt-2 text-xs text-deep-navy/55">
          Released {formatDateTime(reservation.released_at)}
          {reservation.release_reason ? ` · ${reservation.release_reason}` : ""}
        </p>
      )}

      <div className="mt-4">
        <Link
          href={`/orders/${reservation.order_id}`}
          className="rounded-full border border-deep-navy/20 px-3.5 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5 hover:text-agro-green"
        >
          View order
        </Link>
      </div>
    </li>
  );
}

function ReservationsSkeleton() {
  return (
    <div className="space-y-6">
      <LineSkeleton width="w-64" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-9 w-24 rounded-full bg-deep-navy/8" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();
  const [status, setStatus] = useState<StatusTab>("all");
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [data, setData] = useState<PaginatedReservationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReservations = useCallback(
    async (accessToken: string, pageNumber: number, statusTab: StatusTab) => {
      const response = await reservationsApi.list(accessToken, {
        page: pageNumber,
        limit: PAGE_SIZE,
        ...(statusTab !== "all" ? { status: statusTab } : {}),
      });
      return response.data;
    },
    [],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    void loadReservations(token, page, status)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(errorMessage(err, "Unable to load reservations."));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, page, status, retryKey, loadReservations]);

  function selectStatus(next: StatusTab) {
    if (next === status) return;
    setStatus(next);
    setPage(1);
    setLoading(true);
  }

  function changePage(next: number) {
    setPage(next);
    setLoading(true);
  }

  function retry() {
    setError("");
    setLoading(true);
    setRetryKey((value) => value + 1);
  }

  if (authLoading || loading) return <ReservationsSkeleton />;

  if (authError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">{authError}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-agro-green hover:underline">
          Return to login
        </Link>
      </div>
    );
  }

  if (!token) {
    return <p className="py-12 text-center text-sm text-deep-navy/60">Redirecting to sign in…</p>;
  }

  const reservations = data?.reservations ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Stock held for orders while payment is confirmed."
      />

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={retry} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={status === tab.value}
              onClick={() => selectStatus(tab.value)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                status === tab.value
                  ? "bg-agro-green text-white shadow-sm"
                  : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="text-xs text-deep-navy/50">
          {data.total} {data.total === 1 ? "reservation" : "reservations"}
        </p>
      )}

      {reservations.length === 0 && !error ? (
        <div className="rounded-2xl border border-deep-navy/8 bg-white shadow-sm">
          <EmptyState
            title={status === "all" ? "No reservations yet" : `No ${STATUS_LABEL[status]} reservations`}
            description={
              status === "all"
                ? "Reservations created for orders will appear here."
                : "Try another reservation status."
            }
            actionLabel={status === "all" ? undefined : "View all"}
            onAction={status === "all" ? undefined : () => selectStatus("all")}
          />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {reservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />
    </div>
  );
}
