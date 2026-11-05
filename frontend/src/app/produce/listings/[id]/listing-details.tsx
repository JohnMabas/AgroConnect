"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listingsApi, mediaUrl, type ListingData } from "@/lib/api";
import { StatusBadge } from "@/components/listings/status-badge";

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export default function ListingDetailsPage({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<ListingData | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await listingsApi.getById(listingId);
        if (active) setListing(res.data.listing);
      } catch {
        if (active) {
          setError("This listing is unavailable or could not be loaded.");
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [listingId]);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
        <Link
          href="/produce"
          className="mt-4 inline-block text-sm font-semibold text-agro-green hover:underline"
        >
          ← Back to produce catalogue
        </Link>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 text-deep-navy/60">
        Loading listing…
      </main>
    );
  }

  const images = listing.images ?? [];
  const orderedImages = [
    ...images.filter((image) => image.is_primary),
    ...images.filter((image) => !image.is_primary),
  ];
  const image = orderedImages[selectedImage];
  const location = [
    listing.community,
    listing.local_government_area,
    listing.state_or_region,
    listing.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-soft-bg px-5 py-8 sm:px-8">
      <article className="mx-auto grid max-w-5xl gap-8 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2 md:p-8">
        <section>
          <div className="aspect-square overflow-hidden rounded-xl bg-fresh-green/10">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(image.image_url)}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full items-center justify-center text-5xl"
                aria-label="No produce photograph"
              >
                🌾
              </div>
            )}
          </div>

          {orderedImages.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {orderedImages.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View photo ${index + 1}`}
                    aria-current={selectedImage === index}
                    className={`block aspect-square w-full overflow-hidden rounded-lg border-2 ${
                      selectedImage === index
                        ? "border-agro-green"
                        : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(item.image_url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-agro-green">
            {listing.produce_type?.name ?? "Produce"}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold text-deep-navy">
            {listing.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={listing.status} />
            {!listing.is_available && (
              <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                Currently unavailable
              </span>
            )}
          </div>

          <p className="mt-5 text-deep-navy/75">
            {listing.description || "No additional description was provided."}
          </p>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-deep-navy/55">Available</dt>
              <dd className="font-bold text-deep-navy">
                {listing.available_quantity} {listing.unit}
              </dd>
            </div>
            <div>
              <dt className="text-deep-navy/55">Price</dt>
              <dd className="font-bold text-deep-navy">
                {formatMoney(listing.price_per_unit, listing.currency)} /{" "}
                {listing.unit}
              </dd>
            </div>
            {listing.variety && (
              <div>
                <dt className="text-deep-navy/55">Variety</dt>
                <dd className="text-deep-navy">{listing.variety}</dd>
              </div>
            )}
            {listing.grade && (
              <div>
                <dt className="text-deep-navy/55">Grade</dt>
                <dd className="text-deep-navy">{listing.grade}</dd>
              </div>
            )}
            {listing.packaging_description && (
              <div>
                <dt className="text-deep-navy/55">Packaging</dt>
                <dd className="text-deep-navy">
                  {listing.packaging_description}
                </dd>
              </div>
            )}
            {listing.farmer?.display_name && (
              <div>
                <dt className="text-deep-navy/55">Farmer</dt>
                <dd className="text-deep-navy">{listing.farmer.display_name}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-deep-navy/55">Collection location</dt>
              <dd className="text-deep-navy">
                {location || listing.collection_location || "Provided on request"}
              </dd>
            </div>
            {formatDate(listing.available_from) && (
              <div>
                <dt className="text-deep-navy/55">Available from</dt>
                <dd className="text-deep-navy">
                  {formatDate(listing.available_from)}
                </dd>
              </div>
            )}
            {formatDate(listing.expiry_date) && (
              <div>
                <dt className="text-deep-navy/55">Best before</dt>
                <dd className="text-deep-navy">
                  {formatDate(listing.expiry_date)}
                </dd>
              </div>
            )}
          </dl>

          <Link
            href="/produce"
            className="mt-8 inline-block text-sm font-semibold text-agro-green hover:underline"
          >
            ← Back to produce catalogue
          </Link>
        </section>
      </article>
    </main>
  );
}
