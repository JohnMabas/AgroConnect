"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  buyerRequestsApi,
  produceApi,
  type BuyerRequestData,
  type ProduceCategoryData,
  type ApiError,
} from "@/lib/api";
import { Pagination, EmptyState, Alert } from "@/components/ui";

const PAGE_LIMIT = 12;
const DEBOUNCE_MS = 400;

function formatMoney(value: number, currency: string): string {
  if (currency === "NGN") return `₦${value.toLocaleString()}`;
  return `${currency} ${value.toLocaleString()}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
      new Date(`${value}T00:00:00`),
    );
  } catch {
    return value;
  }
}

function getProduceName(r: BuyerRequestData): string {
  return r.produce_type?.name ?? r.produce_category?.name ?? "Agricultural produce";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  open: "bg-fresh-green/15 text-agro-green",
  paused: "bg-harvest-gold/15 text-amber-700",
  fulfilled: "bg-deep-navy/8 text-deep-navy/55",
  cancelled: "bg-red-50 text-red-600",
  expired: "bg-deep-navy/6 text-deep-navy/40",
};

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ request }: { request: BuyerRequestData }) {
  const produceName = getProduceName(request);
  const locationParts = [
    request.community,
    request.local_government_area,
    request.state_or_region,
  ].filter(Boolean);

  return (
    <article className="flex flex-col rounded-2xl border border-deep-navy/8 bg-white shadow-sm shadow-deep-navy/5 transition-shadow hover:shadow-md hover:shadow-deep-navy/8">
      {/* Top accent */}
      <div className="h-1 rounded-t-2xl bg-agro-green/40" />
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[request.status] ?? "bg-deep-navy/8 text-deep-navy/50"}`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
              {request.produce_type?.category?.name && (
                <span className="rounded-full bg-agro-green/8 px-2.5 py-0.5 text-[11px] font-semibold text-agro-green">
                  {request.produce_type.category.name}
                </span>
              )}
              {!request.produce_type && request.produce_category?.name && (
                <span className="rounded-full bg-agro-green/8 px-2.5 py-0.5 text-[11px] font-semibold text-agro-green">
                  {request.produce_category.name}
                </span>
              )}
            </div>
            <h3 className="mt-1.5 font-heading text-base font-bold text-deep-navy">
              {produceName}
            </h3>
          </div>
        </div>

        {/* Quantity */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-heading text-2xl font-extrabold text-agro-green">
            {Number(request.requested_quantity).toLocaleString()}
          </span>
          <span className="text-sm text-deep-navy/60">{request.unit} needed</span>
        </div>

        {/* Price */}
        <p className="mt-1.5 text-sm text-deep-navy/70">
          {request.target_price_per_unit
            ? <>Target: <strong>{formatMoney(request.target_price_per_unit, request.currency)}/{request.unit}</strong></>
            : <span className="text-deep-navy/40">Open to offers</span>}
        </p>

        {/* Location */}
        {locationParts.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-deep-navy/55">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {locationParts.join(", ")}
          </p>
        )}

        {/* Dates */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-deep-navy/50">
          {request.required_delivery_date && (
            <span>Needs by {formatDate(request.required_delivery_date)}</span>
          )}
          <span>Expires {formatDate(request.expiry_date)}</span>
        </div>

        {/* Buyer */}
        {request.buyer?.display_name && (
          <p className="mt-2 text-xs text-deep-navy/40">
            by {request.buyer.display_name}
          </p>
        )}

        {/* CTA */}
        <div className="mt-4 flex flex-1 items-end">
          <Link
            href={`/buyer-requests/${request.id}`}
            className="w-full rounded-full border border-agro-green/30 py-2.5 text-center text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white"
          >
            View Request
          </Link>
        </div>
      </div>
    </article>
  );
}

function RequestSkeleton() {
  return (
    <div className="rounded-2xl border border-deep-navy/8 bg-white p-5">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-20 rounded-full bg-deep-navy/8" />
        <div className="h-5 w-2/3 rounded bg-deep-navy/8" />
        <div className="h-8 w-1/3 rounded bg-deep-navy/6" />
        <div className="h-3 w-1/2 rounded bg-deep-navy/5" />
        <div className="h-9 w-full rounded-full bg-deep-navy/8" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BuyerRequestsPage() {
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("access_token") : null,
  );

  const [categories, setCategories] = useState<ProduceCategoryData[]>([]);
  const [requests, setRequests] = useState<BuyerRequestData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState<"newest" | "delivery_soonest">("newest");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    produceApi.getCategories()
      .then((r) => setCategories(r.data.categories))
      .catch(() => undefined)
      .finally(() => setCatLoading(false));
  }, []);

  const fetchRequests = useCallback(async (pg: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await buyerRequestsApi.list(token, {
        search: debouncedSearch || undefined,
        category_slug: categorySlug || undefined,
        location: location || undefined,
        sort,
        page: pg,
        limit: PAGE_LIMIT,
      });
      setRequests(res.data.requests);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
      setPage(pg);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load buyer requests.");
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, categorySlug, location, sort]);

  useEffect(() => {
    fetchRequests(1).catch(() => undefined);
  }, [token, debouncedSearch, categorySlug, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClearFilters() {
    setSearch(""); setDebouncedSearch(""); setCategorySlug(""); setLocation(""); setSort("newest");
  }

  const hasFilters = search || categorySlug || location;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1 bg-soft-bg">
        {/* Hero */}
        <div className="border-b border-deep-navy/10 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Buyer Requests</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
              What Buyers Are Looking For
            </h1>
            <p className="mt-3 max-w-2xl text-base text-deep-navy/60">
              Discover demand from buyers across Nigeria. Find opportunities for your produce and respond directly.
            </p>
            {token && (
              <div className="mt-5">
                <Link href="/buyer-requests/new" className="inline-flex items-center gap-2 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Post a Request
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Soft auth invite */}
        {!token && (
          <div className="border-b border-agro-green/15 bg-agro-green/5">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
              <p className="flex-1 text-sm text-deep-navy/70">
                <span className="font-semibold text-agro-green">Browse freely.</span>{" "}
                Sign in to post a request or respond to buyers.
              </p>
              <div className="flex shrink-0 gap-3">
                <Link href="/login?redirect=/buyer-requests" className="rounded-full bg-agro-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-deep-navy">Sign in</Link>
                <Link href="/register" className="rounded-full border border-agro-green/30 px-4 py-2 text-xs font-semibold text-agro-green transition-colors hover:bg-agro-green/10">Register</Link>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="lg:flex lg:gap-8">
            {/* Sidebar */}
            <aside className="mb-6 w-full lg:mb-0 lg:w-72 lg:shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); fetchRequests(1).catch(() => undefined); }}
                className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
                <h2 className="font-heading text-sm font-bold text-deep-navy">Filter Requests</h2>

                <div className="mt-4">
                  <label htmlFor="br-search" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Search</label>
                  <div className="relative">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-navy/35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input id="br-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Maize, rice, tomatoes…"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white py-2.5 pl-9 pr-3.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-deep-navy/70">Category</p>
                  {catLoading ? (
                    <div className="space-y-2">{[1,2,3].map(n => <div key={n} className="h-8 animate-pulse rounded-lg bg-deep-navy/8" />)}</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCategorySlug("")}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${!categorySlug ? "bg-agro-green text-white" : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"}`}>
                        All
                      </button>
                      {categories.map(cat => (
                        <button key={cat.slug} type="button" onClick={() => setCategorySlug(cat.slug)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${categorySlug === cat.slug ? "bg-agro-green text-white" : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"}`}>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <label htmlFor="br-location" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Location</label>
                  <input id="br-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="Jos, Plateau…"
                    className="w-full rounded-xl border border-deep-navy/20 bg-white px-3.5 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
                </div>

                <div className="mt-5 flex gap-2">
                  <button type="submit" className="flex-1 rounded-full bg-agro-green py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy">Apply</button>
                  {hasFilters && (
                    <button type="button" onClick={handleClearFilters}
                      className="rounded-full border border-deep-navy/15 px-4 py-2.5 text-sm font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/40 hover:text-agro-green">
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </aside>

            {/* Main content */}
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-deep-navy/60">
                  {loading ? "Loading…" : `${total.toLocaleString()} request${total !== 1 ? "s" : ""} found`}
                </p>
                <div className="flex items-center gap-2">
                  <label htmlFor="br-sort" className="text-xs font-semibold text-deep-navy/60">Sort:</label>
                  <select id="br-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green">
                    <option value="newest">Newest first</option>
                    <option value="delivery_soonest">Delivery date soonest</option>
                  </select>
                </div>
              </div>

              {error && <Alert variant="error" className="mb-5">{error}</Alert>}

              {loading && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <RequestSkeleton key={i} />)}
                </div>
              )}

              {!loading && requests.length > 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {requests.map(r => <RequestCard key={r.id} request={r} />)}
                  </div>
                  <div className="mt-8">
                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchRequests(p).catch(() => undefined)} />
                  </div>
                </>
              )}

              {!loading && requests.length === 0 && !error && (
                <EmptyState
                  icon={<svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                  title={hasFilters ? "No requests match your filters" : "No buyer requests yet"}
                  description={hasFilters ? "Try adjusting your search or filters." : "Buyers haven't posted any requests yet. Check back soon."}
                  action={hasFilters ? (
                    <button type="button" onClick={handleClearFilters}
                      className="rounded-full border border-agro-green/30 px-5 py-2.5 text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white">
                      Clear filters
                    </button>
                  ) : undefined}
                />
              )}

              {!loading && !token && requests.length > 0 && (
                <div className="mt-10 rounded-2xl border border-agro-green/20 bg-agro-green/5 p-8 text-center">
                  <p className="font-heading text-lg font-bold text-deep-navy">Want to respond to buyers?</p>
                  <p className="mt-2 text-sm text-deep-navy/60">Create an account to post your own requests or contact buyers about their demand.</p>
                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <Link href="/register" className="rounded-full bg-agro-green px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy">Create Free Account</Link>
                    <Link href="/login?redirect=/buyer-requests" className="rounded-full border border-agro-green/30 px-6 py-3 text-sm font-bold text-agro-green transition-colors hover:bg-agro-green hover:text-white">Sign In</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
