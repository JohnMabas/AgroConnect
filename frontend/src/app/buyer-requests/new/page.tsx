"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  buyerRequestsApi,
  produceApi,
  type ProduceCategoryData,
  type ProduceTypeData,
  type ApiError,
  type CreateBuyerRequestPayload,
} from "@/lib/api";

const UNIT_SUGGESTIONS = ["kg", "tonnes", "bags (50kg)", "bags (100kg)", "crates", "baskets", "pieces", "litres"];

const inputClass =
  "w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

interface FormValues {
  produce_category_id: string;
  produce_type_id: string;
  requested_quantity: string;
  unit: string;
  target_price_per_unit: string;
  currency: string;
  additional_requirements: string;
  state_or_region: string;
  local_government_area: string;
  community: string;
  preferred_location: string;
  required_delivery_date: string;
  expiry_date: string;
}

const EMPTY: FormValues = {
  produce_category_id: "",
  produce_type_id: "",
  requested_quantity: "",
  unit: "",
  target_price_per_unit: "",
  currency: "NGN",
  additional_requirements: "",
  state_or_region: "",
  local_government_area: "",
  community: "",
  preferred_location: "",
  required_delivery_date: "",
  expiry_date: defaultExpiry(),
};

function validate(form: FormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.produce_category_id && !form.produce_type_id)
    e.produce_category_id = "Select a produce category or specific type.";
  if (!form.requested_quantity || Number(form.requested_quantity) <= 0)
    e.requested_quantity = "Quantity must be greater than zero.";
  if (!form.unit.trim()) e.unit = "Unit is required.";
  if (!form.expiry_date) e.expiry_date = "Expiry date is required.";
  else if (form.expiry_date < today()) e.expiry_date = "Expiry date cannot be in the past.";
  if (form.required_delivery_date && form.required_delivery_date < today())
    e.required_delivery_date = "Delivery date cannot be in the past.";
  if (form.target_price_per_unit && Number(form.target_price_per_unit) < 0)
    e.target_price_per_unit = "Target price cannot be negative.";
  return e;
}

// ─── Helper components ────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  const [categories, setCategories] = useState<ProduceCategoryData[]>([]);
  const [types, setTypes] = useState<ProduceTypeData[]>([]);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = sessionStorage.getItem("access_token");
    setToken(t);
    setTokenReady(true);
  }, []);

  useEffect(() => {
    if (tokenReady && !token) {
      router.push("/login?redirect=/buyer-requests/new");
    }
  }, [token, tokenReady, router]);

  useEffect(() => {
    produceApi.getCategories()
      .then((r) => setCategories(r.data.categories.filter((c) => c.is_active)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.produce_category_id) { setTypes([]); return; }
    produceApi.getTypes({ category_id: form.produce_category_id })
      .then((r) => setTypes(r.data.types.filter((t) => t.is_active)))
      .catch(() => setTypes([]));
    setForm((prev) => ({ ...prev, produce_type_id: "" }));
  }, [form.produce_category_id]);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    if (!token) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const payload: CreateBuyerRequestPayload = {
        produce_category_id: form.produce_category_id || null,
        produce_type_id: form.produce_type_id || null,
        requested_quantity: Number(form.requested_quantity),
        unit: form.unit.trim(),
        currency: form.currency,
        expiry_date: form.expiry_date,
        target_price_per_unit: form.target_price_per_unit ? Number(form.target_price_per_unit) : null,
        additional_requirements: form.additional_requirements.trim() || null,
        state_or_region: form.state_or_region.trim() || null,
        local_government_area: form.local_government_area.trim() || null,
        community: form.community.trim() || null,
        preferred_location: form.preferred_location.trim() || null,
        required_delivery_date: form.required_delivery_date || null,
      };
      const res = await buyerRequestsApi.create(token, payload);
      router.push(`/buyer-requests/${res.data.request.id}`);
    } catch (err) {
      const e = err as ApiError;
      if (e.errors?.length) {
        const fe: Record<string, string> = {};
        e.errors.forEach(({ field, message }) => { fe[field] = message; });
        setFieldErrors(fe);
      } else {
        setSubmitError(e.message || "Failed to create request.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!tokenReady) return null;
  if (!token) return null;

  return (
    <div className="min-h-screen bg-soft-bg">
      {/* Header */}
      <div className="border-b border-deep-navy/10 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
          <Link href="/buyer-requests" className="text-xs font-semibold text-agro-green hover:underline">← Buyer Requests</Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy sm:text-3xl">Post a Buyer Request</h1>
          <p className="mt-1 text-sm text-deep-navy/60">Tell farmers exactly what you need. They will find your request and respond with offers.</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {submitError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
          )}

          {/* Section 1: Produce */}
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-heading text-base font-bold text-deep-navy">What produce do you need?</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="produce_category_id" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">
                  Category <span className="text-red-500">*</span>
                </label>
                <select id="produce_category_id" name="produce_category_id" value={form.produce_category_id} onChange={handleChange}
                  className={`${inputClass} ${fieldErrors.produce_category_id ? "border-red-400" : ""}`}>
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <FieldError msg={fieldErrors["produce_category_id"]} />
              </div>

              {types.length > 0 && (
                <div>
                  <label htmlFor="produce_type_id" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Specific type (optional)</label>
                  <select id="produce_type_id" name="produce_type_id" value={form.produce_type_id} onChange={handleChange} className={inputClass}>
                    <option value="">Any type in this category</option>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Quantity */}
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-heading text-base font-bold text-deep-navy">How much do you need?</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="requested_quantity" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input id="requested_quantity" name="requested_quantity" type="number" min="0.001" step="any"
                  value={form.requested_quantity} onChange={handleChange} placeholder="e.g. 500"
                  className={`${inputClass} ${fieldErrors.requested_quantity ? "border-red-400" : ""}`} />
                <FieldError msg={fieldErrors["requested_quantity"]} />
              </div>
              <div>
                <label htmlFor="unit" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">
                  Unit <span className="text-red-500">*</span>
                </label>
                <input id="unit" name="unit" type="text" list="unit-suggestions"
                  value={form.unit} onChange={handleChange} placeholder="kg, bags, crates…"
                  className={`${inputClass} ${fieldErrors.unit ? "border-red-400" : ""}`} />
                <datalist id="unit-suggestions">
                  {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
                </datalist>
                <FieldError msg={fieldErrors["unit"]} />
              </div>
            </div>
          </section>

          {/* Section 3: Pricing */}
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-heading text-base font-bold text-deep-navy">Pricing (optional)</h2>
            <p className="mt-1 text-xs text-deep-navy/50">Leave blank to accept any offer from farmers.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="target_price_per_unit" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Target price per unit</label>
                <input id="target_price_per_unit" name="target_price_per_unit" type="number" min="0" step="any"
                  value={form.target_price_per_unit} onChange={handleChange} placeholder="e.g. 350"
                  className={`${inputClass} ${fieldErrors.target_price_per_unit ? "border-red-400" : ""}`} />
                <FieldError msg={fieldErrors["target_price_per_unit"]} />
              </div>
              <div>
                <label htmlFor="currency" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Currency</label>
                <select id="currency" name="currency" value={form.currency} onChange={handleChange} className={inputClass}>
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GHS">GHS — Ghanaian Cedi</option>
                  <option value="ZAR">ZAR — South African Rand</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 4: Location */}
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-heading text-base font-bold text-deep-navy">Delivery location</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { id: "state_or_region" as keyof FormValues, label: "State / Region", placeholder: "e.g. Plateau State" },
                { id: "local_government_area" as keyof FormValues, label: "LGA", placeholder: "e.g. Jos North" },
                { id: "community" as keyof FormValues, label: "Community", placeholder: "e.g. Angwan Rimi" },
              ].map(({ id, label, placeholder }) => (
                <div key={id}>
                  <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-deep-navy/70">{label}</label>
                  <input id={id} name={id} type="text" value={form[id]} onChange={handleChange}
                    placeholder={placeholder} className={inputClass} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label htmlFor="preferred_location" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Additional location details</label>
                <input id="preferred_location" name="preferred_location" type="text"
                  value={form.preferred_location} onChange={handleChange}
                  placeholder="e.g. Deliver to warehouse at 15 Station Road, Jos"
                  className={inputClass} />
              </div>
            </div>
          </section>

          {/* Section 5: Dates */}
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-heading text-base font-bold text-deep-navy">Dates</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="required_delivery_date" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">Delivery needed by</label>
                <input id="required_delivery_date" name="required_delivery_date" type="date"
                  min={today()} value={form.required_delivery_date} onChange={handleChange}
                  className={`${inputClass} ${fieldErrors.required_delivery_date ? "border-red-400" : ""}`} />
                <FieldError msg={fieldErrors["required_delivery_date"]} />
              </div>
              <div>
                <label htmlFor="expiry_date" className="mb-1.5 block text-xs font-semibold text-deep-navy/70">
                  Request expires <span className="text-red-500">*</span>
                </label>
                <input id="expiry_date" name="expiry_date" type="date"
                  min={today()} value={form.expiry_date} onChange={handleChange}
                  className={`${inputClass} ${fieldErrors.expiry_date ? "border-red-400" : ""}`} />
                <FieldError msg={fieldErrors["expiry_date"]} />
                <p className="mt-1 text-xs text-deep-navy/45">After this date farmers will no longer see your request.</p>
              </div>
            </div>
          </section>

          {/* Section 6: Requirements */}
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-heading text-base font-bold text-deep-navy">Additional requirements</h2>
            <p className="mt-1 text-xs text-deep-navy/50">Quality, grade, packaging, certification or any other details farmers should know.</p>
            <div className="mt-3">
              <textarea id="additional_requirements" name="additional_requirements" rows={4}
                value={form.additional_requirements} onChange={handleChange}
                maxLength={2000} placeholder="e.g. Grade A quality, 50kg bags, must be certified organic…"
                className={`${inputClass} resize-none`} />
              <p className="mt-1 text-right text-xs text-deep-navy/35">{form.additional_requirements.length}/2000</p>
            </div>
          </section>

          {/* Submit */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link href="/buyer-requests"
              className="rounded-full border border-deep-navy/20 px-6 py-3 text-center text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green">
              Cancel
            </Link>
            <button type="submit" disabled={submitting}
              className="rounded-full bg-agro-green px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Posting request…" : "Post Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
