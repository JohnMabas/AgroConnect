"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { profileApi, type UserProfileData, type ApiError } from "@/lib/api";
import Link from "next/link";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ha", label: "Hausa" },
  { value: "yo", label: "Yoruba" },
  { value: "ig", label: "Igbo" },
];

const EMPTY_FORM: UserProfileData = {
  first_name: "",
  last_name: "",
  display_name: "",
  country: "",
  state_or_region: "",
  local_government_area: "",
  city_or_community: "",
  preferred_language: "en",
};

function nullToEmpty(p: UserProfileData): UserProfileData {
  return {
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    display_name: p.display_name ?? "",
    country: p.country ?? "",
    state_or_region: p.state_or_region ?? "",
    local_government_area: p.local_government_area ?? "",
    city_or_community: p.city_or_community ?? "",
    preferred_language: p.preferred_language || "en",
  };
}

export default function ProfilePage() {
  const { token, user, loading, error: authError } = useDashboardAuth();

  const [form, setForm] = useState<UserProfileData>(EMPTY_FORM);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = await profileApi.getMe(token!);
        setForm(nullToEmpty(res.data.profile));
      } catch {
        // Profile may not exist yet — keep empty form
      } finally {
        setProfileLoading(false);
      }
    }
    void load();
  }, [token]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      await profileApi.updateMe(token, form);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setSaveError((err as ApiError).message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || profileLoading) {
    return <PageSkeleton />;
  }

  if (authError) {
    return (
      <ErrorCard message={authError} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Update your personal details.
        </p>
      </div>

      {/* Roles card */}
      {user && (
        <section className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
            Your Roles
          </h2>
          {user.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-agro-green/10 px-3 py-1 text-sm font-medium capitalize text-agro-green"
                >
                  {role}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-deep-navy/50">No roles assigned.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {user.roles.includes("cooperative_agent") && (
              <Link href="/agent/dashboard" className="text-agro-green hover:underline font-medium">
                → Agent Dashboard
              </Link>
            )}
            {user.roles.includes("admin") && (
              <Link href="/admin/cooperatives" className="text-agro-green hover:underline font-medium">
                → Admin Panel
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Profile form */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Personal Information
        </h2>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup
              id="first_name"
              label="First name"
              value={form.first_name ?? ""}
              onChange={handleChange}
              placeholder="Ada"
            />
            <FieldGroup
              id="last_name"
              label="Last name"
              value={form.last_name ?? ""}
              onChange={handleChange}
              placeholder="Okafor"
            />
          </div>

          <FieldGroup
            id="display_name"
            label="Display name"
            value={form.display_name ?? ""}
            onChange={handleChange}
            placeholder="How you appear to others"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup
              id="country"
              label="Country"
              value={form.country ?? ""}
              onChange={handleChange}
              placeholder="Nigeria"
            />
            <FieldGroup
              id="state_or_region"
              label="State / Region"
              value={form.state_or_region ?? ""}
              onChange={handleChange}
              placeholder="Plateau"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup
              id="local_government_area"
              label="Local Government Area"
              value={form.local_government_area ?? ""}
              onChange={handleChange}
              placeholder="Jos North"
            />
            <FieldGroup
              id="city_or_community"
              label="City / Community"
              value={form.city_or_community ?? ""}
              onChange={handleChange}
              placeholder="Angwan Rogo"
            />
          </div>

          <div>
            <label
              htmlFor="preferred_language"
              className="mb-1.5 block text-sm font-semibold text-deep-navy"
            >
              Preferred language
            </label>
            <select
              id="preferred_language"
              name="preferred_language"
              value={form.preferred_language}
              onChange={handleChange}
              className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
            >
              {LANGUAGES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

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
        className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
      />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
