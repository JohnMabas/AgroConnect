"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { transporterApi, type ApiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileCompletion } from "@/components/dashboard/profile-completion";

type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
type AvailabilityStatus = "available" | "unavailable" | "suspended";

interface TransporterProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  contact_phone: string | null;
  operating_location: string | null;
  coverage_areas: string[] | null;
  produce_types: string[] | null;
  vehicle_type: string | null;
  vehicle_registration_number: string | null;
  vehicle_capacity: string | null;
  availability_status: AvailabilityStatus;
  approval_status: ApprovalStatus;
  suspended_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  business_name: string;
  contact_phone: string;
  operating_location: string;
  coverage_areas: string;
  produce_types: string;
  vehicle_type: string;
  vehicle_registration_number: string;
  vehicle_capacity: string;
}

const EMPTY_FORM: FormState = {
  business_name: "",
  contact_phone: "",
  operating_location: "",
  coverage_areas: "",
  produce_types: "",
  vehicle_type: "",
  vehicle_registration_number: "",
  vehicle_capacity: "",
};

const VEHICLE_TYPES = [
  "Motorcycle",
  "Tricycle (Keke NAPEP)",
  "Pick-up Truck",
  "Mini Truck (1–3 tonnes)",
  "Medium Truck (3–7 tonnes)",
  "Large Truck (7+ tonnes)",
  "Refrigerated Truck",
  "Other",
];

const APPROVAL_STYLES: Record<ApprovalStatus, { badge: string; label: string }> = {
  pending: { badge: "bg-amber-100 text-amber-700", label: "Pending Review" },
  approved: { badge: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { badge: "bg-red-100 text-red-700", label: "Rejected" },
  suspended: { badge: "bg-gray-100 text-gray-600", label: "Suspended" },
};

const INPUT =
  "w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30 disabled:bg-soft-bg disabled:text-deep-navy/40";

function profileToForm(p: TransporterProfile): FormState {
  return {
    business_name: p.business_name ?? "",
    contact_phone: p.contact_phone ?? "",
    operating_location: p.operating_location ?? "",
    coverage_areas: (p.coverage_areas ?? []).join(", "),
    produce_types: (p.produce_types ?? []).join(", "),
    vehicle_type: p.vehicle_type ?? "",
    vehicle_registration_number: p.vehicle_registration_number ?? "",
    vehicle_capacity: p.vehicle_capacity ?? "",
  };
}

function formToPayload(f: FormState) {
  return {
    business_name: f.business_name || null,
    contact_phone: f.contact_phone || null,
    operating_location: f.operating_location || null,
    coverage_areas: f.coverage_areas
      ? f.coverage_areas.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    produce_types: f.produce_types
      ? f.produce_types.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    vehicle_type: f.vehicle_type || null,
    vehicle_registration_number: f.vehicle_registration_number || null,
    vehicle_capacity: f.vehicle_capacity || null,
  };
}

export default function TransporterProfilePage() {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth("transporter");

  const [profile, setProfile] = useState<TransporterProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [success, setSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = (await transporterApi.getMe(token!)) as {
          data: { profile: TransporterProfile };
        };
        setProfile(res.data.profile);
        setForm(profileToForm(res.data.profile));
      } catch {
        // No profile yet — form stays empty (create case handled server-side)
      } finally {
        setProfileLoading(false);
      }
    }
    void load();
  }, [token]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess("");
    setSaveError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSuccess("");
    setSaveError("");
    try {
      const payload = formToPayload(form);
      const res = (await transporterApi.updateMe(token, payload)) as {
        data: { profile: TransporterProfile };
      };
      setProfile(res.data.profile);
      setSuccess("Transport profile updated successfully.");
    } catch (err) {
      setSaveError((err as ApiError).message ?? "Failed to save transport profile.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability() {
    if (!token || !profile || profile.approval_status !== "approved") return;
    const next: AvailabilityStatus =
      profile.availability_status === "available" ? "unavailable" : "available";
    setTogglingAvail(true);
    setSuccess("");
    setSaveError("");
    try {
      const res = (await transporterApi.updateMe(token, {
        availability_status: next,
      })) as { data: { profile: TransporterProfile } };
      setProfile(res.data.profile);
      setSuccess(`Availability set to ${next}.`);
    } catch (err) {
      setSaveError((err as ApiError).message ?? "Failed to update availability.");
    } finally {
      setTogglingAvail(false);
    }
  }

  if (authLoading || profileLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;
  if (!user) return null;

  const approval = profile?.approval_status ?? "pending";
  const approvalStyle = APPROVAL_STYLES[approval] ?? APPROVAL_STYLES.pending;
  const isApproved = approval === "approved";

  const completionItems = [
    { label: "Phone verified", done: user.phone_verified },
    { label: "Email verified", done: user.email_verified },
    { label: "Business name set", done: !!form.business_name },
    { label: "Contact phone set", done: !!form.contact_phone },
    { label: "Operating location set", done: !!form.operating_location },
    { label: "Coverage areas set", done: !!form.coverage_areas },
    { label: "Vehicle type set", done: !!form.vehicle_type },
    { label: "Profile approved", done: isApproved },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Profile"
        description="Manage your transport details and availability."
        breadcrumbs={[
          { label: "Dashboard", href: "/transporter/dashboard" },
          { label: "Transport Profile" },
        ]}
        action={
          <Link
            href="/transporter/dashboard"
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            ← Dashboard
          </Link>
        }
      />

      {/* Approval status */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
              Approval status
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${approvalStyle.badge}`}>
                {approvalStyle.label}
              </span>
              {profile && isApproved && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  profile.availability_status === "available"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {profile.availability_status === "available" ? "Available" : "Unavailable"}
                </span>
              )}
            </div>
          </div>

          {/* Availability toggle — only for approved transporters */}
          {isApproved && profile && (
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={togglingAvail}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                profile.availability_status === "available"
                  ? "bg-deep-navy/8 text-deep-navy hover:bg-deep-navy/15"
                  : "bg-agro-green text-white hover:bg-deep-navy"
              }`}
            >
              {togglingAvail
                ? "Updating…"
                : profile.availability_status === "available"
                ? "Set unavailable"
                : "Set available"}
            </button>
          )}
        </div>

        {!isApproved && (
          <p className="mt-3 text-xs text-deep-navy/55">
            {approval === "pending" &&
              "Your transporter profile is under review. You will be notified when approved."}
            {approval === "rejected" &&
              "Your transporter application was not approved. Contact support for details."}
            {approval === "suspended" && (
              <>
                Your account has been suspended
                {profile?.suspended_reason ? `: ${profile.suspended_reason}` : "."} Contact support
                for assistance.
              </>
            )}
          </p>
        )}
      </section>

      {/* Profile completion */}
      <ProfileCompletion items={completionItems} title="Transport profile completion" />

      {/* Success / error feedback at top */}
      {success && (
        <div role="status" className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      )}
      {saveError && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Edit form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Business details */}
        <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
            Business Details
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="business_name" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Business name
                </label>
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  value={form.business_name}
                  onChange={handleChange}
                  placeholder="e.g. Jibrin Logistics"
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="contact_phone" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Contact phone
                </label>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  value={form.contact_phone}
                  onChange={handleChange}
                  placeholder="+2348031234567"
                  className={INPUT}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="operating_location" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Primary operating location
                </label>
                <input
                  id="operating_location"
                  name="operating_location"
                  type="text"
                  value={form.operating_location}
                  onChange={handleChange}
                  placeholder="e.g. Plateau State"
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="coverage_areas" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Coverage areas{" "}
                  <span className="font-normal text-deep-navy/50">(comma-separated)</span>
                </label>
                <input
                  id="coverage_areas"
                  name="coverage_areas"
                  type="text"
                  value={form.coverage_areas}
                  onChange={handleChange}
                  placeholder="Plateau, Kaduna, Nasarawa"
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label htmlFor="produce_types" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                Produce types handled{" "}
                <span className="font-normal text-deep-navy/50">(comma-separated)</span>
              </label>
              <input
                id="produce_types"
                name="produce_types"
                type="text"
                value={form.produce_types}
                onChange={handleChange}
                placeholder="Grains, Vegetables, Fruits"
                className={INPUT}
              />
            </div>
          </div>
        </section>

        {/* Vehicle details */}
        <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
            Vehicle Details
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vehicle_type" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Vehicle type
                </label>
                <select
                  id="vehicle_type"
                  name="vehicle_type"
                  value={form.vehicle_type}
                  onChange={handleChange}
                  className={INPUT}
                >
                  <option value="">Select vehicle type</option>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vehicle_registration_number" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Registration number
                </label>
                <input
                  id="vehicle_registration_number"
                  name="vehicle_registration_number"
                  type="text"
                  value={form.vehicle_registration_number}
                  onChange={handleChange}
                  placeholder="e.g. PL-123-ABJ"
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label htmlFor="vehicle_capacity" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                Vehicle capacity
              </label>
              <input
                id="vehicle_capacity"
                name="vehicle_capacity"
                type="text"
                value={form.vehicle_capacity}
                onChange={handleChange}
                placeholder="e.g. 3 tonnes, 500 kg"
                className={INPUT}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save transport profile"}
        </button>
      </form>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-xl bg-deep-navy/10" />
      <div className="h-20 rounded-2xl bg-white shadow-sm" />
      <div className="h-32 rounded-2xl bg-white shadow-sm" />
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm space-y-3">
          {[1, 2, 3].map((j) => (
            <div key={j} className="h-10 rounded-xl bg-deep-navy/5" />
          ))}
        </div>
      ))}
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
