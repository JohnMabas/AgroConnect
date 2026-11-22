"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { marketplaceApi, mediaUrl, type ListingData, type ApiError } from "@/lib/api";
import { detailImageUrl, thumbnailImageUrl } from "@/lib/cloudinary";
import { getUserIdFromToken } from "@/lib/session";
import { resolveConversationForContext } from "@/lib/messaging";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingImage } from "@/components/listings/listing-image";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
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

function isContactable(listing: ListingData): boolean {
  if (listing.status !== "published" || listing.available_quantity <= 0) {
    return false;
  }
  if (!listing.expiry_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${listing.expiry_date}T00:00:00`);
  return !Number.isNaN(expiry.getTime()) && expiry >= today;
}

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  published: "Available",
  paused: "Paused",
  sold_out: "Sold Out",
  closed: "Closed",
  expired: "Expired",
  draft: "Draft",
};

const STATUS_CLASS: Record<string, string> = {
  published: "bg-fresh-green/15 text-agro-green",
  paused: "bg-harvest-gold/15 text-amber-700",
  sold_out: "bg-red-50 text-red-600",
  closed: "bg-deep-navy/8 text-deep-navy/55",
  expired: "bg-deep-navy/8 text-deep-navy/55",
  draft: "bg-deep-navy/8 text-deep-navy/55",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl animate-pulse gap-8 md:grid-cols-2">
      <div className="aspect-square rounded-2xl bg-deep-navy/8" />
      <div className="space-y-5">
        <div className="h-5 w-32 rounded-lg bg-deep-navy/8" />
        <div className="h-9 w-3/4 rounded-xl bg-deep-navy/8" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-deep-navy/6" />
          <div className="h-4 w-5/6 rounded bg-deep-navy/6" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-deep-navy/6" />)}
        </div>
        <div className="h-12 w-full rounded-full bg-deep-navy/8" />
      </div>
    </div>
  );
}

// ─── Login prompt shown when guest taps Contact / Buy ────────────────────────

function LoginPrompt({ listingId }: { listingId: string }) {
  return (
    <div className="rounded-2xl border border-agro-green/20 bg-agro-green/5 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-agro-green/10">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 text-agro-green"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <p className="font-heading text-base font-bold text-deep-navy">
        Sign in to contact the farmer
      </p>
      <p className="mt-1 text-sm text-deep-navy/60">
        Create a free account or sign in to message farmers, make offers and
        arrange purchases.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href={`/login?redirect=/marketplace/${listingId}`}
          className="rounded-full bg-agro-green px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-deep-navy"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="rounded-full border border-agro-green/30 px-6 py-2.5 text-sm font-bold text-agro-green transition-colors hover:bg-agro-green hover:text-white"
        >
          Create Free Account
        </Link>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketplaceListingClient({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState("");

  // Hydrate token from sessionStorage on client (guests have no token)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("access_token");
      setToken(stored);
      setUserId(getUserIdFromToken(stored));
    }
  }, []);

  const loadListing = useCallback(
    async (tok: string | null, id: string) => {
      setLoading(true);
      setError("");
      try {
        // token is optional — works for guests too
        const res = await marketplaceApi.getListing(tok, id);
        setListing(res.data.listing);
        setSelectedImage(0);
      } catch (err) {
        const e = err as ApiError;
        if (e.status === 401) {
          // Clear a stale token and retry without it
          setToken(null);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("access_token");
          }
          // Retry once as a guest
          try {
            const retry = await marketplaceApi.getListing(null, id);
            setListing(retry.data.listing);
            setSelectedImage(0);
          } catch {
            setError("This listing is no longer available.");
          }
        } else if (e.status === 404) {
          setError("This listing is no longer available or could not be found.");
        } else {
          setError(e.message || "Failed to load listing.");
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleContact = useCallback(async () => {
    if (!token || !userId || !listing) return;
    if (listing.farmer_user_id === userId) {
      setContactError("This is your own listing.");
      return;
    }
    setContacting(true);
    setContactError("");
    try {
      const conversationId = await resolveConversationForContext(token, {
        participant_user_id: listing.farmer_user_id,
        listing_id: listing.id,
      });
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      setContactError(
        err instanceof Error ? err.message : "Could not start a conversation.",
      );
    } finally {
      setContacting(false);
    }
  }, [token, userId, listing, router]);

  // Load listing on mount — no redirect for guests
  useEffect(() => {
    if (!listingId) return;
    // token may still be null at this point (not yet hydrated) —
    // loadListing accepts null and works without auth.
    void loadListing(token, listingId);
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1 bg-soft-bg">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <PageSkeleton />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1 bg-soft-bg">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h1 className="font-heading text-xl font-bold text-deep-navy">
                Listing unavailable
              </h1>
              <p className="mt-2 text-sm text-deep-navy/60">{error}</p>
              <Link
                href="/marketplace"
                className="mt-6 inline-block rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
              >
                ← Back to Marketplace
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!listing) return null;

  const images = listing.images ?? [];
  const orderedImages = [
    ...images.filter((img) => img.is_primary),
    ...images.filter((img) => !img.is_primary),
  ];
  const currentImage = orderedImages[selectedImage];

  const locationParts = [
    listing.community,
    listing.local_government_area,
    listing.state_or_region,
    listing.country,
  ].filter(Boolean);
  const location = locationParts.join(", ");

  const isAvailable =
    listing.status === "published" && listing.available_quantity > 0;
  const isOwner = !!userId && listing.farmer_user_id === userId;
  const canContact = isContactable(listing) && !isOwner;

  const availPct =
    listing.quantity > 0
      ? Math.min(
          100,
          Math.round((listing.available_quantity / listing.quantity) * 100),
        )
      : 0;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1 bg-soft-bg">
        {/* Breadcrumb */}
        <div className="border-b border-deep-navy/8 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-3 sm:px-8 lg:px-10">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-deep-navy/50">
              <Link href="/marketplace" className="transition-colors hover:text-agro-green">
                Marketplace
              </Link>
              <svg aria-hidden="true" viewBox="0 0 6 10" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l4 4-4 4" />
              </svg>
              <span className="max-w-xs truncate text-deep-navy/80">
                {listing.produce_type?.name ?? "Produce"}
              </span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <article className="rounded-2xl border border-deep-navy/8 bg-white shadow-sm shadow-deep-navy/5">
            <div className="grid gap-0 md:grid-cols-2">
              {/* Images panel */}
              <div className="p-5 md:border-r md:border-deep-navy/8 md:p-8">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-soft-bg">
                  {currentImage ? (
                    <ListingImage
                      src={detailImageUrl(mediaUrl(currentImage.image_url))}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-6xl"
                      aria-label="No produce photograph"
                    >
                      🌾
                    </div>
                  )}
                </div>

                {orderedImages.length > 1 && (
                  <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" role="list">
                    {orderedImages.map((img, idx) => (
                      <li key={img.id} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedImage(idx)}
                          aria-label={`View photo ${idx + 1}`}
                          aria-pressed={selectedImage === idx}
                          className={`block h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                            selectedImage === idx
                              ? "border-agro-green"
                              : "border-transparent hover:border-deep-navy/20"
                          }`}
                        >
                          <ListingImage
                            src={thumbnailImageUrl(mediaUrl(img.image_url))}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Availability bar */}
                <div className="mt-5 rounded-xl border border-deep-navy/8 bg-soft-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-deep-navy/50">
                    Availability
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-deep-navy">
                      {Number(listing.available_quantity).toLocaleString()}{" "}
                      <span className="font-normal text-deep-navy/60">
                        {listing.unit} available
                      </span>
                    </span>
                    <span className="text-xs text-deep-navy/50">{availPct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-deep-navy/8">
                    <div
                      className="h-full rounded-full bg-fresh-green"
                      style={{ width: `${availPct}%` }}
                      role="presentation"
                    />
                  </div>
                  {Number(listing.reserved_quantity) > 0 && (
                    <p className="mt-1.5 text-xs text-deep-navy/45">
                      {Number(listing.reserved_quantity).toLocaleString()} {listing.unit} reserved
                      {Number(listing.sold_quantity) > 0
                        ? ` · ${Number(listing.sold_quantity).toLocaleString()} sold`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Details panel */}
              <div className="p-5 md:p-8">
                {/* Category & status */}
                <div className="flex flex-wrap items-center gap-2">
                  {listing.produce_type && (
                    <span className="rounded-full bg-agro-green/10 px-2.5 py-1 text-xs font-semibold text-agro-green">
                      {listing.produce_type.name}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[listing.status] ?? "bg-deep-navy/8 text-deep-navy/55"}`}
                  >
                    {STATUS_LABEL[listing.status] ?? listing.status}
                  </span>
                </div>

                <h1 className="mt-3 font-heading text-2xl font-extrabold leading-tight text-deep-navy sm:text-3xl">
                  {listing.title}
                </h1>

                {/* Price */}
                <p className="mt-4 font-heading text-3xl font-extrabold text-agro-green">
                  {formatMoney(listing.price_per_unit, listing.currency)}
                  <span className="ml-2 text-base font-normal text-deep-navy/55">
                    per {listing.unit}
                  </span>
                </p>

                {listing.description && (
                  <p className="mt-4 text-sm leading-relaxed text-deep-navy/70">
                    {listing.description}
                  </p>
                )}

                {/* Detail grid */}
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  {listing.variety && (
                    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                      <dt className="text-xs text-deep-navy/50">Variety</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{listing.variety}</dd>
                    </div>
                  )}
                  {listing.grade && (
                    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                      <dt className="text-xs text-deep-navy/50">Grade</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{listing.grade}</dd>
                    </div>
                  )}
                  {listing.packaging_description && (
                    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                      <dt className="text-xs text-deep-navy/50">Packaging</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{listing.packaging_description}</dd>
                    </div>
                  )}
                  {formatDate(listing.harvest_date) && (
                    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                      <dt className="text-xs text-deep-navy/50">Harvested</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{formatDate(listing.harvest_date)}</dd>
                    </div>
                  )}
                  {formatDate(listing.available_from) && (
                    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                      <dt className="text-xs text-deep-navy/50">Available from</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{formatDate(listing.available_from)}</dd>
                    </div>
                  )}
                  {formatDate(listing.expiry_date) && (
                    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                      <dt className="text-xs text-deep-navy/50">Best before</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{formatDate(listing.expiry_date)}</dd>
                    </div>
                  )}
                </dl>

                {/* Location */}
                {(location || listing.collection_location) && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-3">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-4 w-4 shrink-0 text-agro-green"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div>
                      <p className="text-xs text-deep-navy/50">Location</p>
                      <p className="mt-0.5 text-sm font-semibold text-deep-navy">
                        {location || "Provided on request"}
                      </p>
                      {listing.collection_location &&
                        listing.collection_location !== location && (
                          <p className="mt-0.5 text-xs text-deep-navy/55">
                            Pickup: {listing.collection_location}
                          </p>
                        )}
                    </div>
                  </div>
                )}

                {/* Seller */}
                {listing.farmer?.display_name && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-agro-green/15 text-sm font-bold text-agro-green">
                      {listing.farmer.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-deep-navy/50">Farmer</p>
                      <p className="text-sm font-semibold text-deep-navy">
                        {listing.farmer.display_name}
                      </p>
                    </div>
                  </div>
                )}

                <p className="mt-4 text-xs text-deep-navy/40">
                  Listed {formatDateTime(listing.created_at)}
                  {listing.updated_at !== listing.created_at &&
                    ` · Updated ${formatDateTime(listing.updated_at)}`}
                </p>

                {/* Action area */}
                <div className="mt-6 space-y-3">
                  {!isAvailable ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                      <p className="text-sm font-semibold text-red-700">
                        {listing.status === "sold_out"
                          ? "This listing is sold out."
                          : listing.status === "paused"
                            ? "This listing is currently paused."
                            : listing.status === "expired"
                              ? "This listing has expired."
                              : listing.status === "closed"
                                ? "This listing is closed."
                                : "This listing is not currently available."}
                      </p>
                      <p className="mt-1 text-xs text-red-600/70">
                        Search for similar produce in the marketplace.
                      </p>
                    </div>
                  ) : isOwner ? (
                    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg p-4 text-center text-sm text-deep-navy/60">
                      This is your listing. Buyers can contact you from here.
                    </div>
                  ) : token && canContact ? (
                    // Authenticated
                    <>
                      {contactError && (
                        <p role="alert" className="text-xs text-red-700">
                          {contactError}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={contacting}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-agro-green py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void handleContact()}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        {contacting ? "Opening conversation…" : "Contact Farmer"}
                      </button>
                    </>
                  ) : !token ? (
                    // Guest — show login prompt instead of contact button
                    <LoginPrompt listingId={listingId} />
                  ) : (
                    <div className="rounded-xl border border-harvest-gold/25 bg-harvest-gold/8 p-4 text-center text-sm text-amber-800">
                      This listing can no longer be contacted.
                    </div>
                  )}

                  <Link
                    href="/marketplace"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-deep-navy/15 py-2.5 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
                  >
                    ← Back to Marketplace
                  </Link>
                </div>

                <p className="mt-4 text-xs text-deep-navy/35">
                  Offers, orders and payments are available in the next platform phases.
                </p>
              </div>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
