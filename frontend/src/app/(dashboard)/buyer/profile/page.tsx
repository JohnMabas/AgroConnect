"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { profileApi, mediaUrl, type UserProfileData, type ApiError } from "@/lib/api";
import { SingleImageUpload } from "@/components/uploads/single-image-upload";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileCompletion } from "@/components/dashboard/profile-completion";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ha", label: "Hausa" },
  { value: "yo", label: "Yoruba" },
  { value: "ig", label: "Igbo" },
];

const EMPTY: UserProfileData = {
  first_name: null,
  last_name: null,
  display_name: null,
  profile_image_url: null,
  country: null,
  state_or_region: null,
  local_government_area: null,
  city_or_community: null,
  preferred_language: "en",
};

function nullToStr(p: UserProfileData): Record<string, string> {
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

const INPUT =
  "w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30";

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-deep-navy">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={INPUT}
      />
    </div>
  );
}

export default function BuyerProfilePage() {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth("buyer");

  const [form, setForm] = useState<Record<string, string>>(nullToStr(EMPTY));
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = await profileApi.getMe(token!);
        setForm(nullToStr(res.data.profile));
        setProfileImageUrl(res.data.profile.profile_image_url ?? null);
      } catch {
        // Profile not yet created — keep empty form
      } finally {
        setProfileLoading(false);
      }
    }
    void load();
  }, [token]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess("");
    setSaveError("");
  }

  async function handleImageUpload(
    file: File,
    onProgress: (percent: number) => void,
  ): Promise<string> {
    if (!token) throw new Error("You must be signed in to upload a photo.");
    const res = await profileApi.uploadImage(token, file, onProgress);
    setProfileImageUrl(res.data.profile.profile_image_url ?? null);
    setSuccess("Profile photo updated.");
    return res.data.profile.profile_image_url ?? "";
  }

  async function handleImageRemove() {
    if (!token) throw new Error("You must be signed in to remove a photo.");
    const res = await profileApi.deleteImage(token);
    setProfileImageUrl(res.data.profile.profile_image_url ?? null);
    setSuccess("Profile photo removed.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSuccess("");
    setSaveError("");
    try {
      const payload: Partial<UserProfileData> = {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        display_name: form.display_name || null,
        country: form.country || null,
        state_or_region: form.state_or_region || null,
        local_government_area: form.local_government_area || null,
        city_or_community: form.city_or_community || null,
        preferred_language: form.preferred_language || "en",
      };
      await profileApi.updateMe(token, payload);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setSaveError((err as ApiError).message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || profileLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;
  if (!user) return null;

  const completionItems = [
    { label: "Phone verified", done: user.phone_verified },
    { label: "Email verified", done: user.email_verified },
    { label: "Display name set", done: !!form.display_name },
    { label: "First name set", done: !!form.first_name },
    { label: "State / region set", done: !!form.state_or_region },
    { label: "LGA set", done: !!form.local_government_area },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your buyer account details."
        breadcrumbs={[
          { label: "Dashboard", href: "/buyer/dashboard" },
          { label: "My Profile" },
        ]}
        action={
          <Link
            href="/buyer/dashboard"
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            ← Dashboard
          </Link>
        }
      />

      {/* Account status */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                user.phone_verified ? "bg-green-500" : "bg-deep-navy/20"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                user.phone_verified ? "text-green-700" : "text-deep-navy/40"
              }`}
            >
              Phone {user.phone_verified ? "verified" : "unverified"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                user.email_verified ? "bg-green-500" : "bg-deep-navy/20"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                user.email_verified ? "text-green-700" : "text-deep-navy/40"
              }`}
            >
              Email {user.email_verified ? "verified" : "unverified"}
            </span>
          </div>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              user.status === "active"
                ? "bg-green-100 text-green-700"
                : user.status === "suspended"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {user.status}
          </span>
        </div>
        {(!user.phone_verified || !user.email_verified) && (
          <p className="mt-3 text-xs text-deep-navy/50">
            {!user.phone_verified && !user.email_verified
              ? "Neither your phone nor email is verified. "
              : !user.phone_verified
              ? "Your phone number is not verified. "
              : "Your email address is not verified. "}
            Verify your contact details to unlock all features.
          </p>
        )}
      </section>

      {/* Profile completion */}
      <ProfileCompletion items={completionItems} title="Profile completion" />

      {/* Profile photo */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Profile Photo
        </h2>
        <SingleImageUpload
          value={mediaUrl(profileImageUrl)}
          onChange={setProfileImageUrl}
          upload={handleImageUpload}
          remove={handleImageRemove}
          label="Profile picture"
          alt="Profile picture"
          disabled={!token || saving}
        />
      </section>

      {/* Edit form */}
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

          <Field
            id="display_name"
            label="Display name"
            value={form.display_name}
            onChange={handleChange}
            placeholder="How you appear to other users"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="first_name"
              label="First name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="Ada"
            />
            <Field
              id="last_name"
              label="Last name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Okafor"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="country"
              label="Country"
              value={form.country}
              onChange={handleChange}
              placeholder="Nigeria"
            />
            <Field
              id="state_or_region"
              label="State / Region"
              value={form.state_or_region}
              onChange={handleChange}
              placeholder="Abuja FCT"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="local_government_area"
              label="Local Government Area"
              value={form.local_government_area}
              onChange={handleChange}
              placeholder="Garki"
            />
            <Field
              id="city_or_community"
              label="City / Community"
              value={form.city_or_community}
              onChange={handleChange}
              placeholder="Area 1"
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
              className={INPUT}
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

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-xl bg-deep-navy/10" />
      <div className="h-20 rounded-2xl bg-white shadow-sm" />
      <div className="h-32 rounded-2xl bg-white shadow-sm" />
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm space-y-4">
        {[1, 2, 3, 4].map((i) => (
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
