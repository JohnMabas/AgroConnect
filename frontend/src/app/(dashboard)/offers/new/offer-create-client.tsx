"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  buyerRequestsApi,
  listingsApi,
  offersApi,
  type ApiError,
} from "@/lib/api";
import {
  EMPTY_OFFER_FORM,
  OFFER_UNITS,
  offerFormToPayload,
  validateOfferForm,
  type OfferFormValues,
} from "@/lib/offer-form";

export const inputClass =
  "mt-1 w-full rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none transition-colors placeholder:text-deep-navy/40 focus:border-agro-green focus:ring-2 focus:ring-agro-green/30 disabled:bg-deep-navy/5";

function formatMoney(value: number, currency: string) {
  return currency === "NGN"
    ? `₦${value.toLocaleString()}`
    : `${currency} ${value.toLocaleString()}`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-xs text-red-600">
      {message}
    </span>
  );
}

export function OfferFormFields({
  form,
  errors,
  onChange,
  units = OFFER_UNITS,
  unitLocked = false,
  currencyLocked = false,
}: {
  form: OfferFormValues;
  errors: Record<string, string>;
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  units?: readonly string[];
  unitLocked?: boolean;
  currencyLocked?: boolean;
}) {
  return (
    <>
      <section className="grid gap-4 rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm sm:grid-cols-2">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50 sm:col-span-2">
          Offer terms
        </h2>
        <label className="text-sm font-medium text-deep-navy">
          Quantity
          <input
            name="quantity"
            type="number"
            min="0.001"
            step="any"
            value={form.quantity}
            onChange={onChange}
            placeholder="e.g. 500"
            className={inputClass}
          />
          <FieldError message={errors.quantity} />
        </label>
        <label className="text-sm font-medium text-deep-navy">
          Unit
          <select name="unit" value={form.unit} onChange={onChange} disabled={unitLocked} className={inputClass}>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {unitLocked && (
            <span className="mt-1 block text-xs text-deep-navy/50">
              The unit is set by this listing or buyer request.
            </span>
          )}
          <FieldError message={errors.unit} />
        </label>
        <label className="text-sm font-medium text-deep-navy">
          Price per unit
          <input
            name="unit_price"
            type="number"
            min="0"
            step="any"
            value={form.unit_price}
            onChange={onChange}
            placeholder="e.g. 350"
            className={inputClass}
          />
          <FieldError message={errors.unit_price} />
        </label>
        <label className="text-sm font-medium text-deep-navy">
          Currency
          <input
            name="currency"
            value={form.currency}
            onChange={onChange}
            maxLength={3}
            disabled={currencyLocked}
            className={inputClass}
          />
          <FieldError message={errors.currency} />
        </label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm sm:grid-cols-2">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50 sm:col-span-2">
          Delivery
        </h2>
        <label className="text-sm font-medium text-deep-navy sm:col-span-2">
          Delivery terms
          <textarea
            name="delivery_terms"
            rows={3}
            value={form.delivery_terms}
            onChange={onChange}
            placeholder="Payment and collection arrangements"
            className={`${inputClass} resize-none`}
          />
          <FieldError message={errors.delivery_terms} />
        </label>
        <label className="text-sm font-medium text-deep-navy sm:col-span-2">
          Delivery location
          <input
            name="delivery_location"
            value={form.delivery_location}
            onChange={onChange}
            placeholder="Town, LGA, state"
            className={inputClass}
          />
          <FieldError message={errors.delivery_location} />
        </label>
        <label className="text-sm font-medium text-deep-navy">
          Delivery date
          <input
            name="delivery_date"
            type="date"
            value={form.delivery_date}
            onChange={onChange}
            className={inputClass}
          />
          <FieldError message={errors.delivery_date} />
        </label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm sm:grid-cols-2">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/50 sm:col-span-2">
          Message and expiry
        </h2>
        <label className="text-sm font-medium text-deep-navy sm:col-span-2">
          Message
          <textarea
            name="buyer_message"
            rows={3}
            value={form.buyer_message}
            onChange={onChange}
            placeholder="Add any details for the recipient"
            className={`${inputClass} resize-none`}
          />
          <FieldError message={errors.buyer_message} />
        </label>
        <label className="text-sm font-medium text-deep-navy">
          Offer expires at
          <input
            name="expires_at"
            type="datetime-local"
            value={form.expires_at}
            onChange={onChange}
            className={inputClass}
          />
          <FieldError message={errors.expires_at} />
        </label>
      </section>
    </>
  );
}

export default function OfferCreateClient({
  listingId,
  buyerRequestId,
  conversationId,
}: {
  listingId: string;
  buyerRequestId: string;
  conversationId: string;
}) {
  const router = useRouter();
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [form, setForm] = useState<OfferFormValues>(EMPTY_OFFER_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contextText, setContextText] = useState("");
  const [contextLoading, setContextLoading] = useState(
    !!(listingId || buyerRequestId),
  );
  const [contextError, setContextError] = useState("");
  const [unitOptions, setUnitOptions] = useState<readonly string[]>(OFFER_UNITS);
  const [unitLocked, setUnitLocked] = useState(false);

  useEffect(() => {
    if (!token || (!listingId && !buyerRequestId)) return;
    let cancelled = false;

    async function loadContext() {
      setContextLoading(true);
      setContextError("");
      try {
        if (listingId) {
          const res = await listingsApi.getById(listingId, token!);
          const listing = res.data.listing;
          if (!cancelled) {
            setContextText(
              `Listing: ${listing.title} · ${listing.available_quantity.toLocaleString()} ${listing.unit} available at ${formatMoney(listing.price_per_unit, listing.currency)}/${listing.unit}`,
            );
            setUnitOptions(Array.from(new Set([listing.unit, ...OFFER_UNITS])));
            setUnitLocked(true);
            setForm((prev) => ({
              ...prev,
              quantity: String(listing.available_quantity),
              unit: listing.unit,
              currency: listing.currency,
              unit_price: String(listing.price_per_unit),
            }));
          }
        } else {
          const res = await buyerRequestsApi.getById(token!, buyerRequestId);
          const request = res.data.request;
          const produce =
            request.produce_type?.name ??
            request.produce_category?.name ??
            "Agricultural produce";
          if (!cancelled) {
            setContextText(
              `Buyer request: ${produce} · ${request.requested_quantity.toLocaleString()} ${request.unit} needed${request.target_price_per_unit ? ` · target ${formatMoney(request.target_price_per_unit, request.currency)}/${request.unit}` : ""}`,
            );
            setUnitOptions(Array.from(new Set([request.unit, ...OFFER_UNITS])));
            setUnitLocked(true);
            setForm((prev) => ({
              ...prev,
              quantity: String(request.requested_quantity),
              unit: request.unit,
              currency: request.currency,
              unit_price: request.target_price_per_unit
                ? String(request.target_price_per_unit)
                : prev.unit_price,
            }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setContextError(
            (err as ApiError).message ?? "Could not load the offer context.",
          );
        }
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [token, listingId, buyerRequestId]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !token ||
      (!listingId && !buyerRequestId) ||
      contextLoading ||
      contextError
    ) {
      return;
    }

    const errors = validateOfferForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await offersApi.create(token, {
        ...offerFormToPayload(form),
        listing_id: listingId || undefined,
        buyer_request_id: listingId ? undefined : buyerRequestId || undefined,
        conversation_id: conversationId || undefined,
      });
      router.push(`/offers/${res.data.offer.id}`);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.errors?.length) {
        const fromApi: Record<string, string> = {};
        apiError.errors.forEach(({ field, message }) => {
          fromApi[field] = message;
        });
        setFieldErrors(fromApi);
      }
      setSubmitError(apiError.message ?? "Unable to create the offer.");
    } finally {
      setSubmitting(false);
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

  if (!listingId && !buyerRequestId) {
    return (
      <div className="space-y-4 rounded-2xl border border-deep-navy/8 bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-xl font-bold text-deep-navy">
          Offer context required
        </h1>
        <p className="text-sm text-deep-navy/60">
          Open a listing or a buyer request and choose to make an offer from
          there.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/marketplace"
            className="rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
          >
            Browse marketplace
          </Link>
          <Link
            href="/buyer-requests"
            className="rounded-full border border-deep-navy/20 px-5 py-2.5 text-sm font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
          >
            Browse buyer requests
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return <p className="p-8 text-sm text-deep-navy/60">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/offers"
          className="text-xs font-semibold text-agro-green hover:underline"
        >
          ← Back to offers
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy">
          Create Offer
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Set out the quantity, price and delivery terms you are proposing.
        </p>
      </div>

      <div className="rounded-2xl border border-agro-green/20 bg-agro-green/5 p-4">
        {contextLoading ? (
          <p className="text-sm text-deep-navy/60">Loading offer context…</p>
        ) : contextError ? (
          <p role="alert" className="text-sm text-red-700">
            {contextError}
          </p>
        ) : (
          <p className="text-sm font-medium text-deep-navy/75">{contextText}</p>
        )}
        {conversationId && (
          <p className="mt-1 text-xs text-deep-navy/50">
            This offer is linked to an existing conversation.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {submitError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submitError}
          </div>
        )}

        <OfferFormFields
          form={form}
          errors={fieldErrors}
          onChange={handleChange}
          units={unitOptions}
          unitLocked={unitLocked}
          currencyLocked={unitLocked}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/offers"
            className="rounded-full border border-deep-navy/20 px-6 py-3 text-center text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-agro-green px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending offer…" : "Send offer"}
          </button>
        </div>
      </form>
    </div>
  );
}
