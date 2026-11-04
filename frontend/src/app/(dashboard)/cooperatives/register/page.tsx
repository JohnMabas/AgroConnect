"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { cooperativeApi, type ApiError } from "@/lib/api";

type CoopStatus = "pending" | "approved" | "rejected" | "suspended";

interface CooperativeData {
  id: string;
  cooperative_name: string;
  status: CoopStatus;
  approval_notes: string | null;
  registration_number: string | null;
  description: string | null;
  created_at: string;
}

interface CoopFormData {
  cooperative_name: string;
  registration_number: string;
  description: string;
  country: string;
  state_or_region: string;
  local_government_area: string;
  community: string;
  address: string;
  contact_phone: string;
  contact_email: string;
}

const EMPTY_FORM: CoopFormData = {
  cooperative_name: "",
  registration_number: "",
  description: "",
  country: "",
  state_or_region: "",
  local_government_area: "",
  community: "",
  address: "",
  contact_phone: "",
  contact_email: "",
};

const STATUS_STYLES: Record<CoopStatus, string> = {
  pending: "bg-harvest-gold/10 text-harvest-gold",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
};

export default function CooperativesRegisterPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [existing, setExisting] = useState<CooperativeData | null>(null);
  const [checkLoading, setCheckLoading] = useState(true);
  const [form, setForm] = useState<CoopFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    async function check() {
      try {
        const res = (await cooperativeApi.getMe(token!)) as {
          data: { cooperative: CooperativeData };
        };
        setExisting(res.data.cooperative);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.status !== 404) {
          // Unexpected error — still show the form
        }
      } finally {
        setCheckLoading(false);
      }
    }
    void check();
  }, [token]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSubmitError("");
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[e.target.name];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.cooperative_name.trim()) {
      setFieldErrors({ cooperative_name: "Cooperative name is required." });
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSuccess("");

    try {
      const payload = {
        cooperative_name: form.cooperative_name.trim(),
        registration_number: form.registration_number.trim() || undefined,
        description: form.description.trim() || undefined,
        country: form.country.trim() || undefined,
        state_or_region: form.state_or_region.trim() || undefined,
        local_government_area: form.local_government_area.trim() || undefined,
        community: form.community.trim() || undefined,
        address: form.address.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
      };
      const res = (await cooperativeApi.create(token, payload)) as {
        data: { cooperative: CooperativeData };
      };
      setExisting(res.data.cooperative);
      setSuccess(
        "Your cooperative has been submitted for review. You will be notified once it is approved.",
      );
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const e of apiErr.errors) {
          map[e.field] = e.message;
        }
        setFieldErrors(map);
      } else {
        setSubmitError(apiErr.message ?? "Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || checkLoading) {
    return <PageSkeleton />;
  }

  if (authError) {
    return <ErrorCard message={authError} />;
  }

  // Already has a cooperative — show status card
  if (existing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            Cooperative Registration
          </h1>
        </div>

        {success && (
          <div role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-bold text-deep-navy">
              {existing.cooperative_name}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[existing.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {existing.status}
            </span>
          </div>

          {existing.status === "pending" && (
            <div className="rounded-xl border border-harvest-gold/30 bg-harvest-gold/5 px-4 py-3 text-sm text-harvest-gold">
              Your cooperative is under review. We will notify you once approved.
            </div>
          )}

          {existing.status === "approved" && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Your cooperative is approved and active.{" "}
              <Link
                href="/cooperatives/dashboard"
                className="font-semibold hover:underline"
              >
                Go to dashboard →
              </Link>
            </div>
          )}

          {existing.status === "rejected" && (
            <div className="space-y-2">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Your cooperative application was rejected.
              </div>
              {existing.approval_notes && (
                <div className="rounded-xl border border-deep-navy/10 bg-soft-bg px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50 mb-1">
                    Reviewer notes
                  </p>
                  <p className="text-sm text-deep-navy">{existing.approval_notes}</p>
                </div>
              )}
            </div>
          )}

          {existing.status === "suspended" && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Your cooperative has been suspended. Please contact support.
            </div>
          )}

          {existing.registration_number && (
            <p className="mt-4 text-sm text-deep-navy/60">
              Registration no: <strong className="text-deep-navy">{existing.registration_number}</strong>
            </p>
          )}
        </section>
      </div>
    );
  }

  // Show registration form
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Register a Cooperative
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Submit your cooperative details for platform review.
        </p>
      </div>

      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {submitError && (
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div>
            <label
              htmlFor="cooperative_name"
              className="mb-1.5 block text-sm font-semibold text-deep-navy"
            >
              Cooperative name <span className="text-red-500">*</span>
            </label>
            <input
              id="cooperative_name"
              name="cooperative_name"
              type="text"
              required
              value={form.cooperative_name}
              onChange={handleChange}
              placeholder="Plateau Farmers Cooperative"
              className={inputClass(!!fieldErrors["cooperative_name"])}
            />
            {fieldErrors["cooperative_name"] && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors["cooperative_name"]}</p>
            )}
          </div>

          <FieldGroup
            id="registration_number"
            label="Registration number"
            value={form.registration_number}
            onChange={handleChange}
            placeholder="CAC/CO/12345 (optional)"
            error={fieldErrors["registration_number"]}
          />

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-semibold text-deep-navy"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              placeholder="Briefly describe your cooperative's mission and activities…"
              className="w-full resize-y rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup id="country" label="Country" value={form.country} onChange={handleChange} placeholder="Nigeria" error={fieldErrors["country"]} />
            <FieldGroup id="state_or_region" label="State / Region" value={form.state_or_region} onChange={handleChange} placeholder="Plateau" error={fieldErrors["state_or_region"]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup id="local_government_area" label="LGA" value={form.local_government_area} onChange={handleChange} placeholder="Jos North" error={fieldErrors["local_government_area"]} />
            <FieldGroup id="community" label="Community" value={form.community} onChange={handleChange} placeholder="Angwan Rogo" error={fieldErrors["community"]} />
          </div>

          <FieldGroup id="address" label="Address" value={form.address} onChange={handleChange} placeholder="12 Farm Road, Jos" error={fieldErrors["address"]} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup id="contact_phone" label="Contact phone" value={form.contact_phone} onChange={handleChange} placeholder="+2348031234567" error={fieldErrors["contact_phone"]} />
            <FieldGroup id="contact_email" label="Contact email" value={form.contact_email} onChange={handleChange} placeholder="info@cooperative.org" error={fieldErrors["contact_email"]} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function inputClass(hasError = false) {
  return `w-full rounded-xl border ${hasError ? "border-red-400" : "border-deep-navy/20"} bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30`;
}

function FieldGroup({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-deep-navy">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClass(!!error)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-xl bg-deep-navy/10" />
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-deep-navy/5" />
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{message}</p>
      <a href="/login" className="mt-4 block text-sm font-semibold text-agro-green hover:underline">
        Return to login
      </a>
    </div>
  );
}
