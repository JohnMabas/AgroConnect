"use client";

import Link from "next/link";
import { mediaUrl, type ListingData } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import { QuantityDisplay } from "./quantity-display";

export type ListingAction =
  | "publish"
  | "pause"
  | "resume"
  | "close"
  | "delete";

export function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

interface ListingCardProps {
  listing: ListingData;
  busy: boolean;
  onAction: (action: ListingAction, id: string) => void;
}

/**
 * Reusable farmer listing card with status indicator, quantity display,
 * primary photograph and lifecycle actions.
 */
export function ListingCard({ listing, busy, onAction }: ListingCardProps) {
  const status = listing.status;
  const primary =
    listing.images?.find((image) => image.is_primary) ?? listing.images?.[0];

  return (
    <li className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-fresh-green/10">
            {primary ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(primary.image_url)}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="flex h-full items-center justify-center text-2xl"
                aria-hidden="true"
              >
                🌾
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {listing.produce_type && (
                <span className="rounded-full bg-fresh-green/20 px-2 py-0.5 text-xs font-semibold text-agro-green">
                  {listing.produce_type.name}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 truncate font-heading text-base font-bold text-deep-navy">
              {listing.title}
            </h2>
            <p className="mt-0.5 text-sm text-deep-navy/60">
              <QuantityDisplay
                available={listing.available_quantity}
                unit={listing.unit}
              />{" "}
              · {formatPrice(listing.price_per_unit, listing.currency)}/
              {listing.unit}
            </p>
            {!listing.is_available && (
              <p className="mt-0.5 text-xs font-semibold text-red-600">
                Not currently available
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {(status === "draft" || status === "paused" || status === "published") && (
            <Link
              href={`/farmer/listings/${listing.id}/edit`}
              className="rounded-full border border-deep-navy/20 px-4 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
            >
              Edit
            </Link>
          )}
          {(status === "published" ||
            status === "paused" ||
            status === "closed" ||
            status === "sold_out" ||
            status === "expired") && (
            <Link
              href={`/produce/listings/${listing.id}`}
              className="rounded-full border border-deep-navy/20 px-4 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
            >
              View
            </Link>
          )}
          <Link
            href="/farmer/inventory"
            className="rounded-full border border-deep-navy/20 px-4 py-1.5 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
          >
            Inventory
          </Link>
          {status === "draft" && (
            <ActionButton
              label="Publish"
              busy={busy}
              className="bg-agro-green text-white hover:bg-deep-navy"
              onClick={() => onAction("publish", listing.id)}
            />
          )}
          {status === "published" && (
            <ActionButton
              label="Pause"
              busy={busy}
              className="border border-harvest-gold/30 bg-harvest-gold/10 text-harvest-gold hover:bg-harvest-gold/20"
              onClick={() => onAction("pause", listing.id)}
            />
          )}
          {status === "paused" && (
            <ActionButton
              label="Resume"
              busy={busy}
              className="bg-agro-green text-white hover:bg-deep-navy"
              onClick={() => onAction("resume", listing.id)}
            />
          )}
          {(status === "published" || status === "paused") && (
            <ActionButton
              label="Close"
              busy={busy}
              className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              onClick={() => onAction("close", listing.id)}
            />
          )}
          {status === "draft" && (
            <ActionButton
              label="Delete"
              busy={busy}
              className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              onClick={() => {
                if (confirm("Delete this listing permanently?")) {
                  onAction("delete", listing.id);
                }
              }}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function ActionButton({
  label,
  busy,
  className,
  onClick,
}: {
  label: string;
  busy: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? "…" : label}
    </button>
  );
}
