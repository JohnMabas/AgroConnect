"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  listingsApi,
  type ApiError,
  type InventoryAdjustmentData,
  type InventorySummaryData,
  type ListingData,
} from "@/lib/api";

const ADJUSTMENT_LABELS: Record<
  InventoryAdjustmentData["adjustment_type"],
  string
> = {
  stock_added: "Stock added",
  stock_removed: "Stock removed",
  correction: "Correction",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function FarmerInventoryPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [listings, setListings] = useState<ListingData[]>([]);
  const [selected, setSelected] = useState<ListingData | null>(null);
  const [summary, setSummary] = useState<InventorySummaryData | null>(null);
  const [history, setHistory] = useState<InventoryAdjustmentData[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [adjustmentType, setAdjustmentType] =
    useState<InventoryAdjustmentData["adjustment_type"]>("stock_added");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const loadListings = useCallback(async () => {
    if (!token) return;
    const res = await listingsApi.getMe(token, 1, 100);
    setListings(res.data.listings);
    return res.data.listings;
  }, [token]);

  const loadDetails = useCallback(
    async (listing: ListingData, page = 1) => {
      if (!token) return;
      const [inventoryRes, historyRes] = await Promise.all([
        listingsApi.getInventory(token, listing.id),
        listingsApi.getAdjustments(token, listing.id, page),
      ]);
      setSummary(inventoryRes.data.inventory);
      setHistory(historyRes.data.adjustments);
      setHistoryPage(historyRes.data.page);
      setHistoryTotalPages(historyRes.data.total_pages);
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;
    async function init() {
      try {
        await loadListings();
      } catch {
        setError("Unable to load inventory. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [token, loadListings]);

  async function selectListing(listing: ListingData) {
    setSelected(listing);
    setSummary(null);
    setHistory([]);
    setMessage("");
    setError("");
    try {
      await loadDetails(listing);
    } catch {
      setError("Unable to load this listing's inventory.");
    }
  }

  async function goToHistoryPage(page: number) {
    if (!selected || page < 1 || page > historyTotalPages) return;
    try {
      await loadDetails(selected, page);
    } catch {
      setError("Unable to load inventory history.");
    }
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selected) return;

    const amount = Number(quantity);
    if (!Number.isFinite(amount)) {
      setError("Enter a valid quantity.");
      return;
    }
    if (adjustmentType !== "correction" && amount <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (adjustmentType === "correction" && amount < 0) {
      setError("The corrected available quantity cannot be negative.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await listingsApi.createAdjustment(token, selected.id, {
        adjustment_type: adjustmentType,
        quantity_change: amount,
        reason: reason.trim() || undefined,
      });

      const refreshed = await loadListings();
      const updated = refreshed?.find((item) => item.id === selected.id);
      if (updated) setSelected(updated);
      await loadDetails(updated ?? selected, 1);
      setQuantity("");
      setReason("");
      setMessage("Stock adjustment recorded.");
    } catch (err) {
      setError(
        (err as ApiError).message ??
          "The adjustment could not be recorded. Check the available quantity.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
        <div className="h-64 rounded-2xl bg-deep-navy/5" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">{authError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Adjust available stock. Reserved and sold stock are protected.
        </p>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-lg bg-fresh-green/20 px-4 py-3 text-sm text-agro-green"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
          <div className="border-b border-deep-navy/10 px-4 py-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50">
              Your listings
            </h2>
          </div>
          {listings.length === 0 ? (
            <p className="p-5 text-sm text-deep-navy/60">
              Create a listing to begin tracking stock.
            </p>
          ) : (
            <ul className="divide-y divide-deep-navy/10">
              {listings.map((listing) => {
                const active = selected?.id === listing.id;
                return (
                  <li key={listing.id}>
                    <button
                      type="button"
                      onClick={() => void selectListing(listing)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        active ? "bg-fresh-green/10" : "hover:bg-soft-bg"
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold text-deep-navy">
                        {listing.title}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-deep-navy/60">
                        <span>
                          Available: {listing.available_quantity} {listing.unit}
                        </span>
                        <span>Reserved: {listing.reserved_quantity}</span>
                        <span>Sold: {listing.sold_quantity}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selected && summary && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-bold text-deep-navy">
                    {summary.title}
                  </h2>
                  <p className="text-xs capitalize text-deep-navy/55">
                    Status: {summary.status.replace("_", " ")}
                  </p>
                </div>
                {!summary.is_balanced && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                    Check stock totals
                  </span>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-soft-bg p-3">
                  <dt className="text-xs text-deep-navy/55">Available</dt>
                  <dd className="font-bold text-deep-navy">
                    {summary.available_quantity}
                  </dd>
                </div>
                <div className="rounded-xl bg-soft-bg p-3">
                  <dt className="text-xs text-deep-navy/55">Reserved</dt>
                  <dd className="font-bold text-deep-navy">
                    {summary.reserved_quantity}
                  </dd>
                </div>
                <div className="rounded-xl bg-soft-bg p-3">
                  <dt className="text-xs text-deep-navy/55">Sold</dt>
                  <dd className="font-bold text-deep-navy">
                    {summary.sold_quantity}
                  </dd>
                </div>
                <div className="rounded-xl bg-soft-bg p-3">
                  <dt className="text-xs text-deep-navy/55">Total</dt>
                  <dd className="font-bold text-deep-navy">
                    {summary.quantity}
                  </dd>
                </div>
              </dl>

              <form onSubmit={submitAdjustment} className="mt-5 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-deep-navy">
                    Adjustment
                    <select
                      value={adjustmentType}
                      onChange={(event) =>
                        setAdjustmentType(
                          event.target
                            .value as InventoryAdjustmentData["adjustment_type"],
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-deep-navy/20 p-2"
                    >
                      <option value="stock_added">Add stock</option>
                      <option value="stock_removed">Remove stock</option>
                      <option value="correction">Set available quantity</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-deep-navy">
                    {adjustmentType === "correction"
                      ? "New available quantity"
                      : "Quantity"}
                    <input
                      required
                      min={adjustmentType === "correction" ? 0 : 0.001}
                      step="0.001"
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-deep-navy/20 p-2"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-deep-navy">
                  Reason (optional)
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={1000}
                    className="mt-1 w-full rounded-lg border border-deep-navy/20 p-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-agro-green px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save adjustment"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50">
                Adjustment history
              </h3>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-deep-navy/60">
                  No adjustments recorded yet.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-deep-navy/10">
                  {history.map((item) => (
                    <li key={item.id} className="py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-deep-navy">
                          {ADJUSTMENT_LABELS[item.adjustment_type]}
                        </span>
                        <span className="text-xs text-deep-navy/50">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-deep-navy/70">
                        {item.previous_available_quantity} →{" "}
                        {item.new_available_quantity} {selected.unit}
                        {item.quantity_change !== 0 && (
                          <span
                            className={
                              item.quantity_change > 0
                                ? " text-agro-green"
                                : " text-red-600"
                            }
                          >
                            {" "}
                            ({item.quantity_change > 0 ? "+" : ""}
                            {item.quantity_change})
                          </span>
                        )}
                      </p>
                      {item.reason && (
                        <p className="mt-0.5 text-xs text-deep-navy/55">
                          {item.reason}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {historyTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    disabled={historyPage <= 1}
                    onClick={() => void goToHistoryPage(historyPage - 1)}
                    className="rounded-full border border-deep-navy/20 px-3 py-1 font-semibold text-deep-navy/70 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-deep-navy/55">
                    Page {historyPage} of {historyTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={historyPage >= historyTotalPages}
                    onClick={() => void goToHistoryPage(historyPage + 1)}
                    className="rounded-full border border-deep-navy/20 px-3 py-1 font-semibold text-deep-navy/70 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
