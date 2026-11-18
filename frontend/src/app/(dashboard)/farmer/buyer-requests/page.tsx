"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  buyerRequestsApi,
  produceApi,
  type BuyerRequestData,
  type ProduceCategoryData,
  type ApiError,
} from "@/lib/api";
import { Pagination } from "@/components/ui";

const PAGE_LIMIT = 12;
const DEBOUNCE_MS = 400;

function formatDate(v: string | null) {
  if (!v) return null;
  try { return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(`${v}T00:00:00`)); }
  catch { return v; }
}

function formatMoney(v: number, c: string) {
  return c === "NGN" ? `₦${v.toLocaleString()}` : `${c} ${v.toLocaleString()}`;
}

function getProduceName(r: BuyerRequestData) {
  return r.produce_type?.name ?? r.produce_category?.name ?? "Agricultural produce";
}

function RequestCard({ r }: { r: BuyerRequestData }) {
  const loc = [r.community, r.local_government_area, r.state_or_region].filter(Boolean).join(", ");
  return (
    <article className="flex flex-col rounded-2xl border border-deep-navy/8 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="h-1 rounded-t-2xl bg-agro-green/40" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-fresh-green/15 px-2.5 py-0.5 text-[11px] font-semibold text-agro-green">Open</span>
          {(r.produce_type?.category?.name ?? r.produce_category?.name) && (
            <span className="rounded-full bg-agro-green/8 px-2.5 py-0.5 text-[11px] font-semibold text-agro-green">
              {r.produce_type?.category?.name ?? r.produce_category?.name}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-heading text-base font-bold text-deep-navy">{getProduceName(r)}</h3>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-heading text-2xl font-extrabold text-agro-green">{Number(r.requested_quantity).toLocaleString()}</span>
          <span className="text-sm text-deep-navy/60">{r.unit} needed</span>
        </div>
        <p className="mt-1 text-sm text-deep-navy/60">
          {r.target_price_per_unit
            ? <><span className="font-semibold text-deep-navy">Target:</span> {formatMoney(r.target_price_per_unit, r.currency)}/{r.unit}</>
            : <span className="text-deep-navy/40">Open to offers</span>}
        </p>
        {loc && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-deep-navy/55">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {loc}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-deep-navy/45">
          {r.required_delivery_date && <span>Needs by {formatDate(r.required_delivery_date)}</span>}
          <span>Expires {formatDate(r.expiry_date)}</span>
        </div>
        {r.buyer?.display_name && <p className="mt-1.5 text-xs text-deep-navy/35">by {r.buyer.display_name}</p>}
        <div className="mt-4 flex flex-1 items-end">
          <Link href={`/buyer-requests/${r.id}`}
            className="w-full rounded-full border border-agro-green/30 py-2.5 text-center text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white">
            View Request
          </Link>
        </div>
      </div>
    </article>
  );
}

function Skeleton() {
  return <div className="rounded-2xl border border-deep-navy/8 bg-white p-5"><div className="animate-pulse space-y-3"><div className="h-4 w-20 rounded-full bg-deep-navy/8" /><div className="h-5 w-2/3 rounded bg-deep-navy/8" /><div className="h-8 w-1/3 rounded bg-deep-navy/6" /><div className="h-3 w-1/2 rounded bg-deep-navy/5" /><div className="h-9 w-full rounded-full bg-deep-navy/8" /></div></div>;
}

export default function FarmerBuyerRequestsPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [categories, setCategories] = useState<ProduceCategoryData[]>([]);
  const [requests, setRequests] = useState<BuyerRequestData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState<"newest" | "delivery_soonest">("newest");

  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [search]);

  useEffect(() => {
    produceApi.getCategories().then((r) => setCategories(r.data.categories)).catch(() => undefined);
  }, []);

  const fetch = useCallback(async (pg: number) => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const res = await buyerRequestsApi.list(token, {
        search: debouncedSearch || undefined,
        category_slug: categorySlug || undefined,
        location: location || undefined,
        sort, page: pg, limit: PAGE_LIMIT,
      });
      setRequests(res.data.requests);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
      setPage(pg);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load requests.");
    } finally { setLoading(false); }
  }, [token, debouncedSearch, categorySlug, location, sort]);

  useEffect(() => {
    if (token) void fetch(1);
  }, [token, debouncedSearch, categorySlug, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />)}</div>;
  if (authError) return <div className="rounded-2xl border border-red-200 bg-white p-8 text-center"><p className="text-sm text-red-700">{authError}</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">Buyer Demand</h1>
        <p className="mt-1 text-sm text-deep-navy/60">Discover what buyers are looking for and find opportunities for your produce.</p>
      </div>

      {/* Filters row */}
      <div className="rounded-2xl border border-deep-navy/8 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-navy/35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search produce…"
              className="w-full rounded-xl border border-deep-navy/20 bg-white py-2.5 pl-9 pr-3 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
          </div>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location…"
            className="min-w-36 flex-1 rounded-xl border border-deep-navy/20 bg-white px-3.5 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy outline-none focus:border-agro-green">
            <option value="newest">Newest first</option>
            <option value="delivery_soonest">Delivery soonest</option>
          </select>
          {(search || categorySlug || location) && (
            <button type="button" onClick={() => { setSearch(""); setDebouncedSearch(""); setCategorySlug(""); setLocation(""); }}
              className="rounded-xl border border-deep-navy/15 px-4 py-2.5 text-sm font-semibold text-deep-navy/60 hover:text-agro-green">
              Clear
            </button>
          )}
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCategorySlug("")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${!categorySlug ? "bg-agro-green text-white" : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"}`}>All</button>
            {categories.map((c) => (
              <button key={c.slug} type="button" onClick={() => setCategorySlug(c.slug)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${categorySlug === c.slug ? "bg-agro-green text-white" : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex items-center justify-between text-sm text-deep-navy/60">
        <span>{loading ? "Loading…" : `${total.toLocaleString()} request${total !== 1 ? "s" : ""} found`}</span>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({length: 6}).map((_, i) => <Skeleton key={i} />)}</div>}

      {!loading && requests.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {requests.map((r) => <RequestCard key={r.id} r={r} />)}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => void fetch(p)} />
        </>
      )}

      {!loading && requests.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-deep-navy/8 bg-white py-20 text-center shadow-sm">
          <span className="mb-4 text-5xl" aria-hidden="true">🔍</span>
          <p className="font-heading text-lg font-semibold text-deep-navy/70">No buyer requests found</p>
          <p className="mt-1 text-sm text-deep-navy/50">Try different filters or check back later.</p>
        </div>
      )}
    </div>
  );
}
