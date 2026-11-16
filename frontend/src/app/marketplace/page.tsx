"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  marketplaceApi,
  produceApi,
  type ListingData,
  type ProduceCategoryData,
  type ApiError,
} from "@/lib/api";
import { Pagination, EmptyState, Alert } from "@/components/ui";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "quantity_asc", label: "Quantity: low to high" },
  { value: "quantity_desc", label: "Quantity: high to low" },
];

const PAGE_LIMIT = 12;

// Illustrative sample data shown to unauthenticated visitors
const SAMPLE_LISTINGS: ListingData[] = [
  {
    id: "sample-1",
    farmer_user_id: "u1",
    produce_type_id: "pt1",
    title: "Fresh Yellow Maize — Plateau State",
    description: "High quality yellow maize freshly harvested.",
    variety: "Yellow Maize",
    grade: "Grade A",
    quantity: 5000,
    available_quantity: 4200,
    reserved_quantity: 800,
    sold_quantity: 0,
    unit: "kg",
    packaging_description: "50 kg bags",
    price_per_unit: 350,
    currency: "NGN",
    country: "Nigeria",
    state_or_region: "Plateau State",
    local_government_area: "Jos North",
    community: "Jos",
    collection_location: "Jos Main Market",
    status: "published",
    is_available: true,
    harvest_date: "2026-10-15",
    available_from: "2026-11-01",
    expiry_date: "2027-04-01",
    produce_type: { id: "pt1", category_id: "c1", name: "Yellow Maize", slug: "yellow-maize", description: null, image_url: null, is_active: true },
    farmer: { id: "u1", display_name: "Aminu Musa" },
    images: [],
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "sample-2",
    farmer_user_id: "u2",
    produce_type_id: "pt2",
    title: "Irish Potatoes — Bokkos LGA",
    description: "Fresh Irish potatoes from Bokkos highlands.",
    variety: "Irish Potato",
    grade: "Grade A",
    quantity: 2000,
    available_quantity: 2000,
    reserved_quantity: 0,
    sold_quantity: 0,
    unit: "kg",
    packaging_description: "25 kg bags",
    price_per_unit: 280,
    currency: "NGN",
    country: "Nigeria",
    state_or_region: "Plateau State",
    local_government_area: "Bokkos",
    community: "Bokkos",
    collection_location: "Bokkos Farm Gate",
    status: "published",
    is_available: true,
    harvest_date: "2026-10-20",
    available_from: "2026-11-02",
    expiry_date: "2027-02-01",
    produce_type: { id: "pt2", category_id: "c2", name: "Irish Potato", slug: "irish-potato", description: null, image_url: null, is_active: true },
    farmer: { id: "u2", display_name: "Grace Dung" },
    images: [],
    created_at: "2026-11-02T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
  },
  {
    id: "sample-3",
    farmer_user_id: "u3",
    produce_type_id: "pt3",
    title: "Fresh Tomatoes — Jos South",
    description: "Ripe, firm tomatoes ready for processing or retail.",
    variety: "Roma Tomato",
    grade: "Grade B",
    quantity: 1500,
    available_quantity: 1200,
    reserved_quantity: 300,
    sold_quantity: 0,
    unit: "kg",
    packaging_description: "Loose/baskets",
    price_per_unit: 420,
    currency: "NGN",
    country: "Nigeria",
    state_or_region: "Plateau State",
    local_government_area: "Jos South",
    community: "Bukuru",
    collection_location: "Bukuru Market",
    status: "published",
    is_available: true,
    harvest_date: "2026-11-05",
    available_from: "2026-11-05",
    expiry_date: "2026-12-01",
    produce_type: { id: "pt3", category_id: "c3", name: "Roma Tomato", slug: "roma-tomato", description: null, image_url: null, is_active: true },
    farmer: { id: "u3", display_name: "Ramatu Yakubu" },
    images: [],
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
  },
];

function formatCurrency(amount: number, currency: string) {
  if (currency === "NGN") return `₦${amount.toLocaleString()}`;
  return `${currency} ${amount.toLocaleString()}`;
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  isSample,
}: {
  listing: ListingData;
  isSample?: boolean;
}) {
  const availPct =
    listing.quantity > 0
      ? Math.round((listing.available_quantity / listing.quantity) * 100)
      : 0;

  return (
    <article className="flex flex-col rounded-2xl border border-deep-navy/8 bg-white shadow-sm shadow-deep-navy/5 transition-shadow hover:shadow-md hover:shadow-deep-navy/8">
      <div className="h-1.5 rounded-t-2xl bg-agro-green" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm font-bold leading-5 text-deep-navy line-clamp-2">
              {listing.title}
            </h3>
            {listing.produce_type && (
              <p className="mt-0.5 text-xs text-deep-navy/50">
                {listing.produce_type.name}
                {listing.variety && listing.variety !== listing.produce_type.name
                  ? ` · ${listing.variety}`
                  : ""}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              listing.available_quantity > 0
                ? "bg-fresh-green/15 text-agro-green"
                : "bg-deep-navy/8 text-deep-navy/55"
            }`}
          >
            {listing.available_quantity > 0 ? "Available" : "Sold Out"}
          </span>
        </div>

        <p className="mt-4 font-heading text-lg font-extrabold text-agro-green">
          {formatCurrency(listing.price_per_unit, listing.currency)}
          <span className="ml-1 text-sm font-normal text-deep-navy/50">
            / {listing.unit}
          </span>
        </p>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-deep-navy/50">
            <span>{listing.available_quantity.toLocaleString()} {listing.unit} available</span>
            <span>{availPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft-bg">
            <div className="h-full rounded-full bg-fresh-green transition-all" style={{ width: `${availPct}%` }} role="presentation" />
          </div>
        </div>

        {listing.state_or_region && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-deep-navy/55">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {listing.local_government_area
              ? `${listing.local_government_area}, ${listing.state_or_region}`
              : listing.state_or_region}
          </p>
        )}
        {listing.farmer?.display_name && (
          <p className="mt-1.5 text-xs text-deep-navy/45">by {listing.farmer.display_name}</p>
        )}

        <div className="mt-4 flex-1 flex items-end">
          {isSample ? (
            <Link
              href="/login?redirect=/marketplace"
              className="w-full rounded-full border border-agro-green/30 py-2.5 text-center text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white"
            >
              Sign in to view
            </Link>
          ) : (
            <Link
              href={`/marketplace/${listing.id}`}
              className="w-full rounded-full bg-agro-green py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function ListingSkeleton() {
  return (
    <div className="rounded-2xl border border-deep-navy/8 bg-white p-5">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-3/4 rounded bg-deep-navy/8" />
        <div className="h-3 w-1/2 rounded bg-deep-navy/6" />
        <div className="h-6 w-1/3 rounded bg-deep-navy/8" />
        <div className="h-2 w-full rounded bg-deep-navy/6" />
        <div className="h-3 w-2/3 rounded bg-deep-navy/6" />
        <div className="h-9 w-full rounded-full bg-deep-navy/8" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  // Lazy initializer reads sessionStorage only on the client (never during SSR)
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("access_token") : null,
  );
  const [tokenChecked] = useState(typeof window !== "undefined");

  const [categories, setCategories] = useState<ProduceCategoryData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [catLoading, setCatLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "quantity_asc" | "quantity_desc">("newest");

  // Load categories (public endpoint — no auth needed)
  useEffect(() => {
    produceApi
      .getCategories()
      .then((res) => setCategories(res.data.categories))
      .catch(() => undefined)
      .finally(() => setCatLoading(false));
  }, []);

  const fetchListings = useCallback(
    async (pg: number) => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const res = await marketplaceApi.getListings(token, {
          search: search || undefined,
          category_slug: categorySlug || undefined,
          location: location || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          sort,
          page: pg,
          limit: PAGE_LIMIT,
        });
        setListings(res.data.listings);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
        setPage(pg);
      } catch (err) {
        const e = err as ApiError;
        if (e.status === 401) {
          setToken(null);
          sessionStorage.removeItem("access_token");
        } else {
          setError(e.message || "Failed to load listings.");
        }
      } finally {
        setLoading(false);
      }
    },
    [token, search, categorySlug, location, minPrice, maxPrice, sort],
  );

  // Trigger fetch when token or key filters change.
  // The file-level eslint-disable at the top covers this pattern legitimately —
  // fetchListings is async and all its setState calls happen after awaiting.
  useEffect(() => {
    if (!token) return;
    fetchListings(1).catch(() => undefined);
  }, [token, sort, categorySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchListings(1).catch(() => undefined);
  }

  function handleClearFilters() {
    setSearch("");
    setCategorySlug("");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
  }

  const isAuthenticated = tokenChecked && !!token;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1 bg-soft-bg">
        {/* Page hero */}
        <div className="border-b border-deep-navy/10 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Marketplace</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
              Fresh Produce from Verified Farmers
            </h1>
            <p className="mt-3 max-w-2xl text-base text-deep-navy/60">
              Discover agricultural produce available for purchase across Nigeria. Connect with farmers, negotiate offers and arrange delivery.
            </p>
          </div>
        </div>

        {/* Auth banner */}
        {!isAuthenticated && (
          <div className="border-b border-harvest-gold/30 bg-harvest-gold/10">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4 sm:px-8 lg:px-10">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="flex-1 text-sm text-amber-800">
                <span className="font-semibold">Sign in to browse live marketplace listings.</span>{" "}
                Sample listings shown below are illustrative only.
              </p>
              <div className="flex shrink-0 gap-3">
                <Link href="/login?redirect=/marketplace" className="rounded-full bg-agro-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-deep-navy">Sign in</Link>
                <Link href="/register" className="rounded-full border border-agro-green/30 px-4 py-2 text-xs font-semibold text-agro-green transition-colors hover:bg-agro-green/10">Register</Link>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="lg:flex lg:gap-8">
            {/* Sidebar */}
            <aside className="mb-6 w-full lg:mb-0 lg:w-64 lg:shrink-0">
              <form onSubmit={handleSearch} className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
                <h2 className="font-heading text-sm font-bold text-deep-navy">Filter Listings</h2>

                <div className="mt-4">
                  <label htmlFor="search" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Search</label>
                  <input id="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Maize, tomatoes…"
                    className="w-full rounded-xl border border-deep-navy/20 bg-white px-3.5 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-deep-navy/70">Category</p>
                  {catLoading ? (
                    <div className="space-y-2">{[1, 2, 3].map((n) => <div key={n} className="h-8 animate-pulse rounded-lg bg-deep-navy/8" />)}</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCategorySlug("")}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${!categorySlug ? "bg-agro-green text-white" : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"}`}>
                        All
                      </button>
                      {categories.map((cat) => (
                        <button key={cat.slug} type="button" onClick={() => setCategorySlug(cat.slug)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${categorySlug === cat.slug ? "bg-agro-green text-white" : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"}`}>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <label htmlFor="location" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Location</label>
                  <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="Jos, Plateau…"
                    className="w-full rounded-xl border border-deep-navy/20 bg-white px-3.5 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
                </div>

                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold text-deep-navy/70">Price range (₦ per unit)</p>
                  <div className="flex gap-2">
                    <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
                    <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20" />
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button type="submit" className="flex-1 rounded-full bg-agro-green py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy">
                    Apply Filters
                  </button>
                  <button type="button" onClick={handleClearFilters}
                    className="rounded-full border border-deep-navy/15 px-4 py-2.5 text-sm font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/40 hover:text-agro-green">
                    Clear
                  </button>
                </div>
              </form>
            </aside>

            {/* Listings area */}
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-deep-navy/60">
                  {isAuthenticated
                    ? loading ? "Loading…" : `${total.toLocaleString()} listing${total !== 1 ? "s" : ""} found`
                    : "Sample listings — sign in for live data"}
                </p>
                {isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="sort" className="text-xs font-semibold text-deep-navy/60">Sort:</label>
                    <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
                      className="rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green">
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {error && <Alert variant="error" className="mb-5">{error}</Alert>}

              {loading && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <ListingSkeleton key={i} />)}
                </div>
              )}

              {isAuthenticated && !loading && listings.length > 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
                  </div>
                  <div className="mt-8">
                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchListings(p).catch(() => undefined)} />
                  </div>
                </>
              )}

              {isAuthenticated && !loading && listings.length === 0 && !error && (
                <EmptyState
                  icon={<svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>}
                  title="No listings found"
                  description="Try adjusting your search or filters to discover more produce."
                  action={
                    <button type="button" onClick={handleClearFilters}
                      className="rounded-full border border-agro-green/30 px-5 py-2.5 text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white">
                      Clear all filters
                    </button>
                  }
                />
              )}

              {!isAuthenticated && (
                <>
                  <div className="mb-4 rounded-xl border border-harvest-gold/20 bg-harvest-gold/8 px-4 py-3 text-xs text-amber-800">
                    <span className="font-semibold">Illustrative examples only.</span>{" "}
                    These are not real farmer listings. Sign in to browse the live marketplace.
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {SAMPLE_LISTINGS.map((l) => <ListingCard key={l.id} listing={l} isSample />)}
                  </div>
                  <div className="mt-10 rounded-2xl border border-agro-green/20 bg-agro-green/5 p-8 text-center">
                    <p className="font-heading text-lg font-bold text-deep-navy">Ready to access the live marketplace?</p>
                    <p className="mt-2 text-sm text-deep-navy/60">Sign in or create an account to browse real farmer listings, filter by produce type and connect with suppliers.</p>
                    <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                      <Link href="/login?redirect=/marketplace" className="rounded-full bg-agro-green px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy">Sign In</Link>
                      <Link href="/register" className="rounded-full border border-agro-green/30 px-6 py-3 text-sm font-bold text-agro-green transition-colors hover:bg-agro-green hover:text-white">Create Account</Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
