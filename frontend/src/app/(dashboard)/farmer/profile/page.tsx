"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { farmerApi, type ApiError } from "@/lib/api";

type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
type FarmSizeUnit = "hectares" | "acres" | "plots";

interface FarmerProfile {
  id: string;
  farm_name: string | null;
  farming_experience_years: number | null;
  farm_location: string | null;
  farm_size: number | null;
  farm_size_unit: FarmSizeUnit | null;
  farming_description: string | null;
  primary_produce_interests: string[] | null;
  verification_status: VerificationStatus;
  cooperative_memberships?: CoopMembership[];
}

interface CoopMembership {
  id: string;
  status: string;
  cooperative?: { id: string; cooperative_name: string };
}

interface FarmerFormData {
  farm_name: string;
  farming_experience_years: string;
  farm_location: string;
  farm_size: string;
  farm_size_unit: FarmSizeUnit;
  farming_description: string;
  primary_produce_interests: string;
}

const EMPTY_FORM: FarmerFormData = {
  farm_name: "",
  farming_experience_years: "",
  farm_location: "",
  farm_size: "",
  farm_size_unit: "hectares",
  farming_description: "",
  primary_produce_interests: "",
};

function profileToForm(p: FarmerProfile): FarmerFormData {
  return {
    farm_name: p.farm_name ?? "",
    farming_experience_years:
      p.farming_experience_years != null
        ? String(p.farming_experience_years)
        : "",
    farm_location: p.farm_location ?? "",
    farm_size: p.farm_size != null ? String(p.farm_size) : "",
    farm_size_unit: p.farm_size_unit ?? "hectares",
    farming_description: p.farming_description ?? "",
    primary_produce_interests: (p.primary_produce_interests ?? []).join(", "),
  };
}

function formToPayload(f: FarmerFormData) {
  return {
    farm_name: f.farm_name || null,
    farming_experience_years: f.farming_experience_years
      ? parseInt(f.farming_experience_years, 10)
      : null,
    farm_location: f.farm_location || null,
    farm_size: f.farm_size ? parseFloat(f.farm_size) : null,
    farm_size_unit: f.farm_size_unit || null,
    farming_description: f.farming_description || null,
    primary_produce_interests: f.primary_produce_interests
      ? f.primary_produce_interests.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  unverified: "bg-gray-100 text-gray-600",
  pending: "bg-harvest-gold/10 text-harvest-gold",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function FarmerProfilePage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [form, setForm] = useState<FarmerFormData>(EMPTY_FORM);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = (await farmerApi.getMe(token!)) as {
          data: { profile: FarmerProfile };
        };
        setProfile(res.data.profile);
        setForm(profileToForm(res.data.profile));
        setIsNew(false);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.status === 404) {
          setIsNew(true);
        }
      } finally {
        setProfileLoading(false);
      }
    }
    void load();
  }, [token]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
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
      if (isNew) {
        const res = (await farmerApi.create(token, payload)) as {
          data: { profile: FarmerProfile };
        };
        setProfile(res.data.profile);
        setIsNew(false);
        setSuccess("Farmer profile created successfully.");
      } else {
        const res = (await farmerApi.updateMe(token, payload)) as {
          data: { profile: FarmerProfile };
        };
        setProfile(res.data.profile);
        setSuccess("Farmer profile updated successfully.");
      }
    } catch (err) {
      setSaveError((err as ApiError).message ?? "Failed to save farmer profile.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || profileLoading) {
    return <PageSkeleton />;
  }

  if (authError) {
    return <ErrorCard message={authError} />;
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            {isNew ? "Create Farmer Profile" : "My Farm"}
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">
            {isNew
              ? "Set up your farmer profile to unlock cooperative and marketplace features."
              : "Manage your farm details."}
          </p>
        </div>
        {!isNew && profile && (
          <span
            className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              VERIFICATION_STYLES[profile.verification_status] ??
              "bg-gray-100 text-gray-600"
            }`}
          >
            {profile.verification_status}
          </span>
        )}
      </div>

      {/* Form */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {saveError && (
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {success && (
            <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          <FieldGroup
            id="farm_name"
            label="Farm name"
            value={form.farm_name}
            onChange={handleChange}
            placeholder="Green Valley Farm"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="farming_experience_years"
                className="mb-1.5 block text-sm font-semibold text-deep-navy"
              >
                Years of farming experience
              </label>
              <input
                id="farming_experience_years"
                name="farming_experience_years"
                type="number"
                min={0}
                max={99}
                value={form.farming_experience_years}
                onChange={handleChange}
                placeholder="5"
                className={inputClass}
              />
            </div>

            <FieldGroup
              id="farm_location"
              label="Farm location"
              value={form.farm_location}
              onChange={handleChange}
              placeholder="Jos, Plateau State"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="farm_size"
                className="mb-1.5 block text-sm font-semibold text-deep-navy"
              >
                Farm size
              </label>
              <input
                id="farm_size"
                name="farm_size"
                type="number"
                min={0}
                step="0.01"
                value={form.farm_size}
                onChange={handleChange}
                placeholder="2.5"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="farm_size_unit"
                className="mb-1.5 block text-sm font-semibold text-deep-navy"
              >
                Size unit
              </label>
              <select
                id="farm_size_unit"
                name="farm_size_unit"
                value={form.farm_size_unit}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="hectares">Hectares</option>
                <option value="acres">Acres</option>
                <option value="plots">Plots</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="farming_description"
              className="mb-1.5 block text-sm font-semibold text-deep-navy"
            >
              Farming description
            </label>
            <textarea
              id="farming_description"
              name="farming_description"
              rows={3}
              value={form.farming_description}
              onChange={handleChange}
              placeholder="Describe your farming activities…"
              className="w-full resize-y rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
            />
          </div>

          <div>
            <label
              htmlFor="primary_produce_interests"
              className="mb-1.5 block text-sm font-semibold text-deep-navy"
            >
              Primary produce interests{" "}
              <span className="font-normal text-deep-navy/50">
                (comma-separated)
              </span>
            </label>
            <input
              id="primary_produce_interests"
              name="primary_produce_interests"
              type="text"
              value={form.primary_produce_interests}
              onChange={handleChange}
              placeholder="Tomatoes, Yam, Maize"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : isNew
                ? "Create farmer profile"
                : "Save changes"}
          </button>
        </form>
      </section>

      {/* Cooperative memberships */}
      {!isNew && profile?.cooperative_memberships && (
        <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
            Cooperative Memberships
          </h2>
          {profile.cooperative_memberships.length === 0 ? (
            <p className="text-sm text-deep-navy/50">
              You have not joined any cooperatives yet.{" "}
              <a
                href="/cooperatives/membership"
                className="font-medium text-agro-green hover:underline"
              >
                Browse cooperatives →
              </a>
            </p>
          ) : (
            <ul className="space-y-2">
              {profile.cooperative_memberships.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-deep-navy/10 px-4 py-3"
                >
                  <span className="text-sm font-medium text-deep-navy">
                    {m.cooperative?.cooperative_name ?? "Unknown cooperative"}
                  </span>
                  <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30";

function FieldGroup({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
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
        className={inputClass}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    approved: "bg-green-100 text-green-700",
    pending: "bg-harvest-gold/10 text-harvest-gold",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
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
