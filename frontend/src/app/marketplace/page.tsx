"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  marketplaceApi,
  produceApi,
  mediaUrl,
  type ListingData,
  type ProduceCategoryData,
  type ProduceTypeData,
  type ApiError,
} from "@/lib/api";
import { cardImageUrl } from "@/lib/cloudinary";
import { Pagination, EmptyState, Alert } from "@/components/ui";
import { ListingImage } from "@/components/listings/listing-image";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "quantity_asc", label: "Quantity: low to high" },
  { value: "quantity_desc", label: "Quantity: high to low" },
];

const PAGE_LIMIT = 12;
const DEBOUNCE_MS = 400;

function formatCurrency(amount: number, currency: string) {
  if (currency === "NGN") return `₦${amount.toLocaleString()}`;
  return `${currency} ${amount.toLocaleString()}`;
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: ListingData }) {
  const availPct =
    listing.quantity > 0
      ? Math.min(
          100,
          Math.round((listing.available_quantity / listing.quantity) * 100),
        )
      : 0;

  const primary =
    listing.images?.find((img) => img.is_primary) ?? listing.images?.[0];

  return (
    <article className="flex flex-col rounded-2xl border border-deep-navy/8 bg-white shadow-sm shadow-deep-navy/5 transition-shadow hover:shadow-md hover:shadow-deep-navy/8">
      {/* Image */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-soft-bg">
        {primary ? (
          <ListingImage
            src={cardImageUrl(mediaUrl(primary.image_url))}
            alt={listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-5xl"
            aria-hidden="true"
          >
            🌾
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm font-bold leading-5 text-deep-navy line-clamp-2">
              {listing.title}
            </h3>
            {listing.produce_type && (
              <p className="mt-0.5 text-xs text-deep-navy/50">
                {listing.produce_type.name}
                {listing.variety &&
                  listing.variety !== listing.produce_type.name
                  ? ` · ${listing.variety}`
                  : ""}
                {listing.grade ? ` · ${listing.grade}` : ""}
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
            <span>
              {listing.available_quantity.toLocaleString()} {listing.unit} available
            </span>
            <span>{availPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft-bg">
            <div
              className="h-full rounded-full bg-fresh-green transition-all"
              style={{ width: `${availPct}%` }}
              role="presentation"
            />
          </div>
        </div>

        {listing.state_or_region && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-deep-navy/55">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0"
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
          </p>
        )}
        {listing.farmer?.display_name && (
          <p className="mt-1.5 text-xs text-deep-navy/45">
            by {listing.farmer.display_name}
          </p>
        )}

        <div className="mt-4 flex flex-1 items-end">
          <Link
            href={`/marketplace/${listing.id}`}
            className="w-full rounded-full bg-agro-green py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}

function ListingSkeleton() {
  return (
    <div className="rounded-2xl border border-deep-navy/8 bg-white p-5">
      <div className="animate-pulse space-y-4">
        <div className="aspect-[4/3] rounded-xl bg-deep-navy/8" />
        <div className="h-4 w-3/4 rounded bg-deep-navy/8" />
        <div className="h-3 w-1/2 rounded bg-deep-navy/6" />
        <div className="h-6 w-1/3 rounded bg-deep-navy/8" />
        <div className="h-2 w-full rounded bg-deep-navy/6" />
        <div className="h-9 w-full rounded-full bg-deep-navy/8" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  // Read token from sessionStorage — may be null for guests
  const [token] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("access_token") : null,
  );

  const [categories, setCategories] = useState<ProduceCategoryData[]>([]);
  const [produceTypes, setProduceTypes] = useState<ProduceTypeData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); // start loading immediately
  const [catLoading, setCatLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [produceTypeId, setProduceTypeId] = useState("");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [sort, setSort] = useState<
    "newest" | "price_asc" | "price_desc" | "quantity_asc" | "quantity_desc"
  >("newest");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Load categories (always public)
  useEffect(() => {
    produceApi
      .getCategories()
      .then((res) => setCategories(res.data.categories))
      .catch(() => undefined)
      .finally(() => setCatLoading(false));
  }, []);

  // Load produce types when category changes
  useEffect(() => {
    if (!categorySlug) {
      setProduceTypes([]);
      setProduceTypeId("");
      return;
    }
    produceApi
      .getTypes({ category_slug: categorySlug })
      .then((res) => setProduceTypes(res.data.types))
      .catch(() => setProduceTypes([]));
    setProduceTypeId("");
  }, [categorySlug]);

  // Fetch listings — token is optional (null for guests)
  const fetchListings = useCallback(
    async (pg: number) => {
      setLoading(true);
      setError("");
      try {
        const res = await marketplaceApi.getListings(token, {
          search: debouncedSearch || undefined,
          category_slug: categorySlug || undefined,
          produce_type_id: produceTypeId || undefined,
          location: location || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          min_quantity: minQuantity ? Number(minQuantity) : undefined,
          max_quantity: maxQuantity ? Number(maxQuantity) : undefined,
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
        setError(e.message || "Failed to load listings.");
      } finally {
        setLoading(false);
      }
    },
    [
      token,
      debouncedSearch,
      categorySlug,
      produceTypeId,
      location,
      minPrice,
      maxPrice,
      minQuantity,
      maxQuantity,
      sort,
    ],
  );

  // Initial load + refetch when key filters change
  useEffect(() => {
    fetchListings(1).catch(() => undefined);
  }, [token, debouncedSearch, categorySlug, produceTypeId, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchListings(1).catch(() => undefined);
  }

  function handleClearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setCategorySlug("");
    setProduceTypeId("");
    setProduceTypes([]);
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setMinQuantity("");
    setMaxQuantity("");
    setSort("newest");
  }

  const hasActiveFilters =
    search ||
    categorySlug ||
    produceTypeId ||
    location ||
    minPrice ||
    maxPrice ||
    minQuantity ||
    maxQuantity;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1 bg-soft-bg">
        {/* Page hero */}
        <div className="border-b border-deep-navy/10 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
              Marketplace
            </p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
              Discover Fresh Produce from Nigerian Farmers
            </h1>
            <p className="mt-3 max-w-2xl text-base text-deep-navy/60">
              Find quality agricultural produce, connect with farmers and
              discover better opportunities in one marketplace.
            </p>
          </div>
        </div>

        {/* Soft sign-in invite for guests — not a hard gate */}
        {!token && (
          <div className="border-b border-agro-green/15 bg-agro-green/5">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
              <p className="flex-1 text-sm text-deep-navy/70">
                <span className="font-semibold text-agro-green">Browse freely.</span>{" "}
                Sign in or register to contact farmers and make purchases.
              </p>
              <div className="flex shrink-0 gap-3">
                <Link
                  href="/login?redirect=/marketplace"
                  className="rounded-full bg-agro-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-deep-navy"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full border border-agro-green/30 px-4 py-2 text-xs font-semibold text-agro-green transition-colors hover:bg-agro-green/10"
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="lg:flex lg:gap-8">
            {/* Sidebar filters */}
            <aside className="mb-6 w-full lg:mb-0 lg:w-72 lg:shrink-0">
              <form
                onSubmit={handleFilterSubmit}
                className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm"
              >
                <h2 className="font-heading text-sm font-bold text-deep-navy">
                  Filter Listings
                </h2>

                {/* Search */}
                <div className="mt-4">
                  <label
                    htmlFor="search"
                    className="mb-1.5 block text-xs font-semibold text-deep-navy/70"
                  >
                    Search
                  </label>
                  <div className="relative">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-navy/35"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      id="search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Maize, tomatoes, rice…"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white py-2.5 pl-9 pr-3.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-deep-navy/70">
                    Category
                  </p>
                  {catLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className="h-8 animate-pulse rounded-lg bg-deep-navy/8"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCategorySlug("");
                          setProduceTypeId("");
                          setProduceTypes([]);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          !categorySlug
                            ? "bg-agro-green text-white"
                            : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"
                        }`}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => setCategorySlug(cat.slug)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            categorySlug === cat.slug
                              ? "bg-agro-green text-white"
                              : "border border-deep-navy/15 text-deep-navy/60 hover:border-agro-green/40 hover:text-agro-green"
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Produce type sub-filter */}
                {produceTypes.length > 0 && (
                  <div className="mt-4">
                    <label
                      htmlFor="produce-type"
                      className="mb-1.5 block text-xs font-semibold text-deep-navy/70"
                    >
                      Produce type
                    </label>
                    <select
                      id="produce-type"
                      value={produceTypeId}
                      onChange={(e) => setProduceTypeId(e.target.value)}
                      className="w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20"
                    >
                      <option value="">All types</option>
                      {produceTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Location */}
                <div className="mt-4">
                  <label
                    htmlFor="location"
                    className="mb-1.5 block text-xs font-semibold text-deep-navy/70"
                  >
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Jos, Plateau, Kaduna…"
                    className="w-full rounded-xl border border-deep-navy/20 bg-white px-3.5 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20"
                  />
                </div>

                {/* Price range */}
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold text-deep-navy/70">
                    Price range (₦ per unit)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      aria-label="Minimum price"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20"
                    />
                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      aria-label="Maximum price"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20"
                    />
                  </div>
                </div>

                {/* Quantity range */}
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold text-deep-navy/70">
                    Quantity range (units)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="Min"
                      aria-label="Minimum quantity"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20"
                    />
                    <input
                      type="number"
                      min="0"
                      value={maxQuantity}
                      onChange={(e) => setMaxQuantity(e.target.value)}
                      placeholder="Max"
                      aria-label="Maximum quantity"
                      className="w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2.5 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/20"
                    />
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-agro-green py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
                  >
                    Apply Filters
                  </button>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="rounded-full border border-deep-navy/15 px-4 py-2.5 text-sm font-semibold text-deep-navy/60 transition-colors hover:border-agro-green/40 hover:text-agro-green"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </aside>

            {/* Listings area */}
            <div className="min-w-0 flex-1">
              {/* Results bar */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-deep-navy/60">
                  {loading
                    ? "Loading…"
                    : `${total.toLocaleString()} listing${total !== 1 ? "s" : ""} found`}
                </p>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="sort"
                    className="text-xs font-semibold text-deep-navy/60"
                  >
                    Sort:
                  </label>
                  <select
                    id="sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <Alert variant="error" className="mb-5">
                  {error}
                </Alert>
              )}

              {/* Loading skeletons */}
              {loading && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ListingSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Results */}
              {!loading && listings.length > 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {listings.map((l) => (
                      <ListingCard key={l.id} listing={l} />
                    ))}
                  </div>
                  <div className="mt-8">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={(p) =>
                        fetchListings(p).catch(() => undefined)
                      }
                    />
                  </div>
                </>
              )}

              {/* Empty */}
              {!loading && listings.length === 0 && !error && (
                <EmptyState
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  }
                  title={
                    hasActiveFilters
                      ? "No listings match your filters"
                      : "No listings available yet"
                  }
                  description={
                    hasActiveFilters
                      ? "Try adjusting your search or filters to discover more produce."
                      : "Check back soon — farmers are adding produce."
                  }
                  action={
                    hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="rounded-full border border-agro-green/30 px-5 py-2.5 text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white"
                      >
                        Clear all filters
                      </button>
                    ) : undefined
                  }
                />
              )}

              {/* Guest CTA at bottom of results */}
              {!loading && !token && listings.length > 0 && (
                <div className="mt-10 rounded-2xl border border-agro-green/20 bg-agro-green/5 p-8 text-center">
                  <p className="font-heading text-lg font-bold text-deep-navy">
                    Ready to contact a farmer?
                  </p>
                  <p className="mt-2 text-sm text-deep-navy/60">
                    Create a free account to message farmers directly, make
                    offers and arrange purchases.
                  </p>
                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <Link
                      href="/register"
                      className="rounded-full bg-agro-green px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy"
                    >
                      Create Free Account
                    </Link>
                    <Link
                      href="/login?redirect=/marketplace"
                      className="rounded-full border border-agro-green/30 px-6 py-3 text-sm font-bold text-agro-green transition-colors hover:bg-agro-green hover:text-white"
                    >
                      Sign In
                    </Link>
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
