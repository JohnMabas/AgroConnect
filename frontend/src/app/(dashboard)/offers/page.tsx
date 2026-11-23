"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  offersApi,
  type ApiError,
  type OfferData,
  type OfferStatus,
} from "@/lib/api";
import { Pagination } from "@/components/ui";

type StatusTab = OfferStatus | "all";
type DirectionFilter = "all" | "sent" | "received";
type SortFilter = "newest" | "expiring_soon";

const TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "countered", label: "Countered" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "expired", label: "Expired" },
];

const STATUS_BADGE: Record<OfferStatus, string> = {
  pending: "bg-harvest-gold/15 text-amber-700",
  countered: "bg-agro-green/10 text-agro-green",
  accepted: "bg-fresh-green/15 text-agro-green",
  rejected: "bg-red-50 text-red-600",
  withdrawn: "bg-deep-navy/8 text-deep-navy/55",
  expired: "bg-deep-navy/6 text-deep-navy/40",
};

const PAGE_LIMIT = 10;

function formatMoney(value: number, currency: string) {
  return currency === "NGN"
    ? `₦${value.toLocaleString()}`
    : `${currency} ${value.toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function personName(offer: OfferData, userId: string, fallback: string) {
  if (offer.buyer?.id === userId) return offer.buyer.display_name ?? "Buyer";
  if (offer.farmer?.id === userId) return offer.farmer.display_name ?? "Farmer";
  return fallback;
}

export default function OffersPage() {
  const { token, user, loading: authLoading, error: authError } =
    useDashboardAuth();

  const [offers, setOffers] = useState<OfferData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [tab, setTab] = useState<StatusTab>("all");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [sort, setSort] = useState<SortFilter>("newest");
  const [contextFilter, setContextFilter] = useState<{
    kind: "listing" | "buyerRequest";
    id: string;
  } | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      if (!token) return;
      setLoading(true);
      setDataError("");
      const activeFilter = contextFilter;
      try {
        const res = await offersApi.list(token, {
          status: sort === "expiring_soon" ? "pending" : tab === "all" ? undefined : tab,
          direction: direction === "all" ? undefined : direction,
          sort,
          listing_id: activeFilter?.kind === "listing" ? activeFilter.id : undefined,
          buyer_request_id: activeFilter?.kind === "buyerRequest" ? activeFilter.id : undefined,
          page: targetPage,
          limit: PAGE_LIMIT,
        });
        setOffers(res.data.offers ?? []);
        setTotal(res.data.total ?? 0);
        setTotalPages(res.data.total_pages ?? 0);
        setPage(res.data.page ?? targetPage);
      } catch (err) {
        setDataError((err as ApiError).message ?? "Failed to load offers.");
      } finally {
        setLoading(false);
      }
    },
    [token, tab, direction, sort, contextFilter],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get("listingId");
    const buyerRequestId = params.get("buyerRequestId");
    if (listingId) setContextFilter({ kind: "listing", id: listingId });
    else if (buyerRequestId) setContextFilter({ kind: "buyerRequest", id: buyerRequestId });
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const hasFilters =
    tab !== "all" || direction !== "all" || sort !== "newest" || !!contextFilter;

  function clearFilters() {
    setTab("all");
    setDirection("all");
    setSort("newest");
    setContextFilter(null);
  }

  if (authError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
      >
        <p className="text-sm text-red-700">{authError}</p>
      </div>
    );
  }

  if (authLoading || loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            Offers
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">
            {total.toLocaleString()} offer{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex shrink-0 items-center rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy"
        >
          Browse marketplace
        </Link>
      </div>

      {dataError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {dataError}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setTab(item.value);
                if (sort === "expiring_soon") setSort("newest");
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                tab === item.value
                  ? "bg-agro-green text-white shadow-sm"
                  : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-deep-navy/8 bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold text-deep-navy/70">
          Direction
          <select
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as DirectionFilter)
            }
            className="ml-2 rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none focus:border-agro-green"
          >
            <option value="all">All</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-deep-navy/70">
          Sort
          <select
            value={sort}
            onChange={(event) => {
              const nextSort = event.target.value as SortFilter;
              setSort(nextSort);
              if (nextSort === "expiring_soon") setTab("pending");
            }}
            className="ml-2 rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none focus:border-agro-green"
          >
            <option value="newest">Newest</option>
            <option value="expiring_soon">Expiring soon</option>
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto rounded-full border border-deep-navy/15 px-4 py-2 text-xs font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            Clear filters
          </button>
        )}
      </div>

      {!dataError && offers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/8 bg-white py-20 text-center shadow-sm">
          <span className="mb-4 text-5xl" aria-hidden="true">
            📄
          </span>
          <p className="font-heading text-lg font-semibold text-deep-navy/70">
            {hasFilters ? "No offers match these filters" : "No offers yet"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-deep-navy/50">
            {hasFilters
              ? "Try a different status or direction."
              : "Send an offer from a listing or a buyer request to get started."}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
            >
              View all offers
            </button>
          ) : (
            <Link
              href="/marketplace"
              className="mt-6 rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
            >
              Browse listings
            </Link>
          )}
        </div>
      )}

      {offers.length > 0 && (
        <ul className="space-y-4">
          {offers.map((offer) => {
            const isSent = offer.created_by === user?.id;
            const otherId = isSent ? offer.recipient_user_id : offer.created_by;
            const other = personName(
              offer,
              otherId,
              isSent ? "Recipient" : "Sender",
            );
            const context = offer.listing?.title
              ? `Listing: ${offer.listing.title}`
              : offer.buyer_request
                ? `Buyer request: ${offer.buyer_request.requested_quantity.toLocaleString()} ${offer.buyer_request.unit} needed`
                : "Agricultural produce";

            return (
              <li key={offer.id}>
                <Link
                  href={`/offers/${offer.id}`}
                  className="block rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm transition-colors hover:border-agro-green/40 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[offer.status] ?? ""}`}
                    >
                      {offer.status.charAt(0).toUpperCase() +
                        offer.status.slice(1)}
                    </span>
                    <span className="rounded-full bg-deep-navy/8 px-2.5 py-0.5 text-[11px] font-semibold text-deep-navy/60">
                      {isSent ? "Sent" : "Received"}
                    </span>
                    <span className="ml-auto text-xs text-deep-navy/40">
                      {offer.offer_number}
                    </span>
                  </div>
                  <h3 className="mt-2 font-heading text-base font-bold text-deep-navy">
                    {context}
                  </h3>
                  <p className="mt-1 text-sm text-deep-navy/70">
                    <strong>
                      {offer.quantity.toLocaleString()} {offer.unit}
                    </strong>{" "}
                    at {formatMoney(offer.unit_price, offer.currency)}/{offer.unit}{" "}
                    · Total {formatMoney(offer.total_amount, offer.currency)}
                  </p>
                  <p className="mt-1 text-xs text-deep-navy/55">
                    {isSent ? "To" : "From"} {other}
                    {offer.parent_offer_id && " · Counter offer"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-deep-navy/45">
                    {formatDate(offer.created_at) && (
                      <span>Created {formatDate(offer.created_at)}</span>
                    )}
                    {formatDate(offer.expires_at) && (
                      <span>Expires {formatDate(offer.expires_at)}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(next) => void load(next)}
      />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-deep-navy/10" />
        <div className="h-10 w-32 rounded-full bg-deep-navy/10" />
      </div>
      <div className="flex gap-2">
        {TABS.map((item) => (
          <div
            key={item.value}
            className="h-9 w-24 rounded-full bg-deep-navy/8"
          />
        ))}
      </div>
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-28 rounded-2xl bg-white shadow-sm" />
      ))}
    </div>
  );
}
