"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  produceApi,
  type ProduceCategoryData,
  type ProduceTypeData,
} from "@/lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("access_token");
}

function excerpt(text: string | null, max = 100): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProduceCataloguePage() {
  const [categories, setCategories] = useState<ProduceCategoryData[]>([]);
  const [types, setTypes] = useState<ProduceTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string>("all");
  const [search, setSearch] = useState("");
  // Derive auth status from sessionStorage on mount (read-only, no setter needed)
  const isLoggedIn = !!getToken();

  useEffect(() => {
    async function load() {
      try {
        const [catRes, typeRes] = await Promise.all([
          produceApi.getCategories(),
          produceApi.getTypes(),
        ]);
        setCategories(catRes.data.categories.filter((c) => c.is_active));
        setTypes(typeRes.data.types.filter((t) => t.is_active));
      } catch {
        setError("Failed to load produce catalogue. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Client-side filter
  const filtered = types.filter((t) => {
    const matchesCategory =
      selectedSlug === "all" ||
      (t.category && t.category.slug === selectedSlug);
    const matchesSearch =
      search.trim() === "" ||
      t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <CatalogueSkeleton />;

  return (
    <div className="min-h-screen bg-soft-bg">
      {/* Header bar */}
      <header className="bg-white border-b border-deep-navy/10 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
              Produce Catalogue
            </h1>
            <p className="text-sm text-deep-navy/60">
              Browse fresh produce available from Nigerian farms.
            </p>
          </div>
          {isLoggedIn && (
            <Link
              href="/farmer/listings/create"
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy"
            >
              + Add Listing
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search produce…"
            aria-label="Search produce"
            className="w-full max-w-sm rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
          />
        </div>

        {/* Category tabs */}
        <div
          role="tablist"
          aria-label="Filter by category"
          className="mb-8 flex flex-wrap gap-2"
        >
          <button
            role="tab"
            aria-selected={selectedSlug === "all"}
            onClick={() => setSelectedSlug("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              selectedSlug === "all"
                ? "bg-agro-green text-white"
                : "bg-white text-deep-navy/70 border border-deep-navy/20 hover:bg-deep-navy/5"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={selectedSlug === cat.slug}
              onClick={() => setSelectedSlug(cat.slug)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                selectedSlug === cat.slug
                  ? "bg-agro-green text-white"
                  : "bg-white text-deep-navy/70 border border-deep-navy/20 hover:bg-deep-navy/5"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm"
          >
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((type) => (
              <ProduceCard key={type.id} type={type} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProduceCard({ type }: { type: ProduceTypeData }) {
  return (
    <li className="rounded-2xl border border-deep-navy/10 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="h-40 bg-fresh-green/10 flex items-center justify-center">
        {type.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={type.image_url}
            alt={type.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl" aria-hidden="true">
            🌿
          </span>
        )}
      </div>

      <div className="p-4">
        {type.category && (
          <span className="inline-block rounded-full bg-fresh-green/20 px-2 py-0.5 text-xs font-semibold text-agro-green mb-1">
            {type.category.name}
          </span>
        )}
        <h2 className="font-heading text-base font-bold text-deep-navy">
          {type.name}
        </h2>
        {type.description && (
          <p className="mt-1 text-xs text-deep-navy/60 leading-relaxed">
            {excerpt(type.description)}
          </p>
        )}

        <Link
          href={`/produce?search=${encodeURIComponent(type.name)}`}
          className="mt-3 inline-flex items-center text-xs font-semibold text-agro-green hover:underline"
        >
          Filter catalogue →
        </Link>
      </div>
    </li>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4" aria-hidden="true">
        🌾
      </span>
      <p className="text-lg font-semibold text-deep-navy/70">
        {search ? `No produce found for "${search}"` : "No produce found"}
      </p>
      <p className="mt-1 text-sm text-deep-navy/50">
        Try a different search or category.
      </p>
    </div>
  );
}

function CatalogueSkeleton() {
  return (
    <div className="min-h-screen bg-soft-bg">
      <div className="bg-white border-b border-deep-navy/10 px-5 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="h-8 w-48 rounded-xl bg-deep-navy/10 animate-pulse" />
          <div className="mt-1 h-4 w-64 rounded-xl bg-deep-navy/5 animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-deep-navy/10" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-deep-navy/10" />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-deep-navy/10 bg-white shadow-sm overflow-hidden"
            >
              <div className="h-40 bg-deep-navy/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-16 rounded-full bg-deep-navy/10" />
                <div className="h-5 w-32 rounded-xl bg-deep-navy/10" />
                <div className="h-3 w-full rounded bg-deep-navy/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
