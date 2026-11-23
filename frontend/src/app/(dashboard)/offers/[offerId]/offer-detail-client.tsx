"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  offersApi,
  ordersApi,
  type ApiError,
  type OfferData,
  type OfferHistoryData,
  type OfferStatus,
} from "@/lib/api";
import {
  EMPTY_OFFER_FORM,
  offerFormToPayload,
  validateOfferForm,
  type OfferFormValues,
} from "@/lib/offer-form";
import { OfferFormFields } from "../new/offer-create-client";

const STATUS_BADGE: Record<OfferStatus, string> = {
  pending: "bg-harvest-gold/15 text-amber-700",
  countered: "bg-agro-green/10 text-agro-green",
  accepted: "bg-fresh-green/15 text-agro-green",
  rejected: "bg-red-50 text-red-600",
  withdrawn: "bg-deep-navy/8 text-deep-navy/55",
  expired: "bg-deep-navy/6 text-deep-navy/40",
};

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

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function personName(offer: OfferData, userId: string, fallback: string) {
  if (offer.buyer?.id === userId) return offer.buyer.display_name ?? "Buyer";
  if (offer.farmer?.id === userId) return offer.farmer.display_name ?? "Farmer";
  return fallback;
}

function actorName(id: string | null, offer: OfferData, userId?: string) {
  if (!id) return "System";
  if (id === userId) return "You";
  if (offer.buyer?.id === id) return offer.buyer.display_name ?? "Buyer";
  if (offer.farmer?.id === id) return offer.farmer.display_name ?? "Farmer";
  return "Participant";
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function offerToForm(offer: OfferData): OfferFormValues {
  return {
    quantity: String(offer.quantity),
    unit: offer.unit,
    unit_price: String(offer.unit_price),
    currency: offer.currency,
    delivery_terms: offer.delivery_terms ?? "",
    delivery_location: offer.delivery_location ?? "",
    delivery_date: offer.delivery_date ?? "",
    buyer_message: offer.buyer_message ?? "",
    expires_at: toLocalDateTimeInput(offer.expires_at),
  };
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
      <dt className="text-xs text-deep-navy/50">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{value}</dd>
    </div>
  );
}

export default function OfferDetailClient({ offerId }: { offerId: string }) {
  const router = useRouter();
  const { token, user, loading: authLoading, error: authError } =
    useDashboardAuth();

  const [offer, setOffer] = useState<OfferData | null>(null);
  const [history, setHistory] = useState<OfferHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [counterForm, setCounterForm] = useState<OfferFormValues>(EMPTY_OFFER_FORM);
  const [counterErrors, setCounterErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const [offerRes, historyRes] = await Promise.all([
        offersApi.get(token, offerId),
        offersApi.history(token, offerId),
      ]);
      setOffer(offerRes.data.offer);
      setHistory(historyRes.data.history);
      setCounterForm(offerToForm(offerRes.data.offer));
    } catch (err) {
      setLoadError((err as ApiError).message ?? "Failed to load this offer.");
    } finally {
      setLoading(false);
    }
  }, [token, offerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: "accept" | "reject" | "withdraw") {
    if (!token || !offer) return;
    if (
      (action === "reject" || action === "withdraw") &&
      !confirm(
        action === "reject" ? "Reject this offer?" : "Withdraw this offer?",
      )
    ) {
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await offersApi[action](token, offer.id);
      setShowCounter(false);
      await load();
    } catch (err) {
      setActionError((err as ApiError).message ?? `Failed to ${action} offer.`);
    } finally {
      setBusy(false);
    }
  }

  async function createOrder() {
    if (!token || !offer) return;
    setBusy(true);
    setActionError("");
    try {
      const res = await ordersApi.create(token, offer.id);
      router.push(`/orders/${res.data.order.id}`);
    } catch (err) {
      setActionError((err as ApiError).message ?? "Failed to create the order.");
    } finally {
      setBusy(false);
    }
  }

  function handleCounterChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setCounterForm((prev) => ({ ...prev, [name]: value }));
    setCounterErrors((prev) => ({ ...prev, [name]: "" }));
    setActionError("");
  }

  async function submitCounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !offer) return;

    const errors = validateOfferForm(counterForm);
    if (Object.keys(errors).length > 0) {
      setCounterErrors(errors);
      return;
    }

    setBusy(true);
    setActionError("");
    try {
      const res = await offersApi.counter(
        token,
        offer.id,
        offerFormToPayload(counterForm),
      );
      router.push(`/offers/${res.data.offer.id}`);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.errors?.length) {
        const fromApi: Record<string, string> = {};
        apiError.errors.forEach(({ field, message }) => {
          fromApi[field] = message;
        });
        setCounterErrors(fromApi);
      }
      setActionError(apiError.message ?? "Unable to send the counter offer.");
    } finally {
      setBusy(false);
    }
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

  if (authLoading || loading) {
    return <p className="p-8 text-sm text-deep-navy/60">Loading offer…</p>;
  }

  if (loadError || !offer) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p role="alert" className="text-sm text-red-700">
          {loadError || "This offer could not be found."}
        </p>
        <Link
          href="/offers"
          className="inline-block text-sm font-semibold text-agro-green hover:underline"
        >
          ← Back to offers
        </Link>
      </div>
    );
  }

  const isCreator = user?.id === offer.created_by;
  const isRecipient = user?.id === offer.recipient_user_id;
  const isBuyer = user?.id === offer.buyer_id;
  const isFarmer = user?.id === offer.farmer_id;
  const canRespond = offer.status === "pending";
  const events = history?.events ?? [];

  const context = offer.listing?.title
    ? `Listing: ${offer.listing.title}`
    : offer.buyer_request
      ? `Buyer request: ${offer.buyer_request.requested_quantity.toLocaleString()} ${offer.buyer_request.unit} needed`
      : "Agricultural produce";

  return (
    <div className="space-y-6">
      <Link
        href="/offers"
        className="text-xs font-semibold text-agro-green hover:underline"
      >
        ← Back to offers
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <article className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[offer.status] ?? ""}`}
              >
                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
              </span>
              <span className="rounded-full bg-deep-navy/8 px-2.5 py-1 text-xs font-semibold text-deep-navy/60">
                {isCreator ? "Sent by you" : "Received"}
              </span>
              {offer.parent_offer_id && (
                <Link
                  href={`/offers/${offer.parent_offer_id}`}
                  className="text-xs font-semibold text-agro-green hover:underline"
                >
                  View original offer
                </Link>
              )}
            </div>

            <h1 className="mt-3 font-heading text-2xl font-extrabold text-deep-navy">
              Offer {offer.offer_number}
            </h1>
            <p className="mt-1 text-sm text-deep-navy/60">{context}</p>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-extrabold text-agro-green">
                {offer.quantity.toLocaleString()}
              </span>
              <span className="text-sm text-deep-navy/60">
                {offer.unit} at {formatMoney(offer.unit_price, offer.currency)}/{offer.unit}
              </span>
            </div>
            <p className="mt-1 text-sm text-deep-navy/70">
              Total:{" "}
              <strong className="text-deep-navy">
                {formatMoney(offer.total_amount, offer.currency)}
              </strong>
            </p>

            {offer.buyer_message && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-deep-navy/50">
                  Message
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-deep-navy/70">
                  {offer.buyer_message}
                </p>
              </div>
            )}

            <p className="mt-5 text-xs text-deep-navy/40">
              Created {formatDateTime(offer.created_at)}
            </p>
          </article>

          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50">
              Offer terms
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Quantity" value={`${offer.quantity.toLocaleString()} ${offer.unit}`} />
              <DetailItem
                label="Price per unit"
                value={`${formatMoney(offer.unit_price, offer.currency)}/${offer.unit}`}
              />
              <DetailItem label="Total amount" value={formatMoney(offer.total_amount, offer.currency)} />
              <DetailItem label="Delivery terms" value={offer.delivery_terms} />
              <DetailItem label="Delivery location" value={offer.delivery_location} />
              <DetailItem label="Delivery date" value={formatDate(offer.delivery_date)} />
              <DetailItem label="Expires" value={formatDate(offer.expires_at)} />
            </dl>
          </section>

          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50">
              Participants
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                <p className="text-xs text-deep-navy/50">Buyer</p>
                <p className="mt-0.5 text-sm font-semibold text-deep-navy">
                  {offer.buyer?.display_name ?? "Buyer"}
                  {isBuyer && " (you)"}
                </p>
              </div>
              <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                <p className="text-xs text-deep-navy/50">Farmer</p>
                <p className="mt-0.5 text-sm font-semibold text-deep-navy">
                  {offer.farmer?.display_name ?? "Farmer"}
                  {isFarmer && " (you)"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-deep-navy/55">
              Created by{" "}
              {isCreator
                ? "you"
                : personName(offer, offer.created_by, "a participant")}{" "}
              · Recipient{" "}
              {isRecipient
                ? "you"
                : personName(offer, offer.recipient_user_id, "a participant")}
            </p>
          </section>

          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50">
              History
            </h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-deep-navy/55">
                No history events recorded yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4 border-l border-deep-navy/10 pl-5">
                {[...events].reverse().map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[1.65rem] top-1.5 h-2.5 w-2.5 rounded-full bg-agro-green ring-4 ring-white" />
                    <p className="text-sm font-semibold capitalize text-deep-navy">
                      {event.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-deep-navy/55">
                      {actorName(event.actor_user_id, offer, user?.id)} ·{" "}
                      {formatDateTime(event.created_at)}
                    </p>
                    {event.previous_status && event.new_status && (
                      <p className="mt-0.5 text-xs text-deep-navy/45">
                        {event.previous_status} → {event.new_status}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {history && history.offers.length > 1 && (
              <div className="mt-5 border-t border-deep-navy/8 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-deep-navy/50">
                  Offer chain
                </p>
                <ul className="mt-2 space-y-1">
                  {history.offers.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/offers/${item.id}`}
                        className="text-xs text-agro-green hover:underline"
                      >
                        {item.offer_number} · {item.status} ·{" "}
                        {formatDate(item.created_at)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {actionError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {actionError}
            </div>
          )}

          <div className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-sm font-bold text-deep-navy">
              Actions
            </h2>

            {!canRespond && (
              <p className="mt-3 text-xs text-deep-navy/55">
                This offer is {offer.status} and can no longer be actioned.
              </p>
            )}

            {canRespond && (
              <div className="mt-4 flex flex-wrap gap-2">
                {isRecipient && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction("accept")}
                      className="rounded-full bg-agro-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "…" : "Accept"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction("reject")}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "…" : "Reject"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setActionError("");
                        setCounterErrors({});
                        setShowCounter((value) => !value);
                      }}
                      className="rounded-full border border-deep-navy/20 px-4 py-2 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {showCounter ? "Cancel counter" : "Counter"}
                    </button>
                  </>
                )}
                {isCreator && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction("withdraw")}
                    className="rounded-full border border-deep-navy/20 px-4 py-2 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "…" : "Withdraw"}
                  </button>
                )}
              </div>
            )}

            {isBuyer && offer.status === "accepted" && (
              <div className="mt-4 border-t border-deep-navy/8 pt-4">
                {offer.listing_id ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void createOrder()}
                    className="w-full rounded-full bg-agro-green px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "…" : "Create order"}
                  </button>
                ) : (
                  <p className="text-xs text-deep-navy/55">
                    This offer has no linked listing, so an order cannot be
                    created.
                  </p>
                )}
              </div>
            )}
          </div>

          {showCounter && canRespond && isRecipient && (
            <form onSubmit={submitCounter} noValidate className="space-y-4">
              <h2 className="font-heading text-sm font-bold text-deep-navy">
                Counter offer
              </h2>
              <OfferFormFields
                form={counterForm}
                errors={counterErrors}
                onChange={handleCounterChange}
                units={[offer.unit]}
                unitLocked
                currencyLocked
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Sending counter…" : "Send counter offer"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
