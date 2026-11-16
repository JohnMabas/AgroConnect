"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";
import { storePendingProfile } from "@/lib/pending-profile";

const FARMING_CATEGORIES = [
  "Cereals & Grains",
  "Vegetables",
  "Fruits",
  "Legumes & Pulses",
  "Root & Tuber Crops",
  "Oil Seeds",
  "Livestock",
  "Poultry",
  "Fishery",
  "Mixed Farming",
];

interface FormState {
  display_name: string;
  phone_number: string;
  email: string;
  password: string;
  password_confirm: string;
  state_or_region: string;
  local_government_area: string;
  community: string;
  farming_category: string;
  terms: boolean;
}

const INIT: FormState = {
  display_name: "",
  phone_number: "",
  email: "",
  password: "",
  password_confirm: "",
  state_or_region: "",
  local_government_area: "",
  community: "",
  farming_category: "",
  terms: false,
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1 text-xs font-medium text-red-600">{msg}</p>;
}

function inputCls(err?: string) {
  return [
    "w-full rounded-xl border px-4 py-3 text-sm text-deep-navy",
    "placeholder:text-deep-navy/35 outline-none transition-colors",
    "focus:ring-2 focus:ring-agro-green/30",
    err
      ? "border-red-400 bg-red-50 focus:border-red-400"
      : "border-deep-navy/20 bg-white focus:border-agro-green",
  ].join(" ");
}

export default function FarmerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INIT);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "global", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; delete n.global; return n; });
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.display_name.trim()) e.display_name = "Full name is required.";
    if (!form.phone_number && !form.email) {
      e.phone_number = "Provide at least a phone number or email.";
      e.email = "Provide at least a phone number or email.";
    }
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (form.password !== form.password_confirm) e.password_confirm = "Passwords do not match.";
    if (!form.terms) e.terms = "You must accept the terms to register.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await authApi.register({
        display_name: form.display_name.trim() || undefined,
        phone_number: form.phone_number || undefined,
        email: form.email || undefined,
        password: form.password,
        password_confirm: form.password_confirm,
        role: "farmer",
      });

      storePendingProfile("farmer", {
        farm_location: [
          form.community,
          form.local_government_area,
          form.state_or_region,
        ]
          .filter(Boolean)
          .join(", "),
        primary_produce_interests: form.farming_category
          ? [form.farming_category]
          : [],
      });

      const { user, phone_otp_pending, email_verification_pending } = result.data;
      if (phone_otp_pending) {
        router.push(`/verify-phone?user_id=${user.id}`);
      } else if (email_verification_pending) {
        router.push(
          `/verify-email?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
        );
      } else {
        router.push("/login?registered=1");
      }
    } catch (err) {
      const ae = err as ApiError;
      if (ae.errors?.length) {
        const fe: typeof errors = {};
        ae.errors.forEach((x) => { fe[x.field as keyof FormState] = x.message; });
        setErrors(fe);
      } else {
        setErrors({ global: ae.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-agro-green/10 text-agro-green">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21V9M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 10c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6z" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Register as a Farmer
        </h1>
        <p className="mt-1.5 text-sm text-deep-navy/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-agro-green hover:underline">Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errors.global && (
          <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.global}
          </div>
        )}

        {/* Full name */}
        <div>
          <label htmlFor="display_name" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Full name <span className="text-red-500">*</span>
          </label>
          <input id="display_name" name="display_name" type="text" autoComplete="name" required
            value={form.display_name} onChange={(e) => set("display_name", e.target.value)}
            placeholder="e.g. Aminu Musa" className={inputCls(errors.display_name)} />
          <FieldError msg={errors.display_name} />
        </div>

        {/* Contact */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-deep-navy">
            Contact <span className="font-normal text-deep-navy/55">— phone, email, or both</span>
          </legend>
          <div className="space-y-3">
            <div>
              <label htmlFor="phone_number" className="mb-1 block text-xs font-medium text-deep-navy/70">Phone number</label>
              <input id="phone_number" name="phone_number" type="tel" autoComplete="tel"
                value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)}
                placeholder="+2348031234567" className={inputCls(errors.phone_number)} />
              <FieldError msg={errors.phone_number} />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-deep-navy/70">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com" className={inputCls(errors.email)} />
              <FieldError msg={errors.email} />
            </div>
          </div>
        </fieldset>

        {/* Location */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="state_or_region" className="mb-1.5 block text-sm font-semibold text-deep-navy">State / Region</label>
            <input id="state_or_region" name="state_or_region" type="text"
              value={form.state_or_region} onChange={(e) => set("state_or_region", e.target.value)}
              placeholder="Plateau State" className={inputCls()} />
          </div>
          <div>
            <label htmlFor="lga" className="mb-1.5 block text-sm font-semibold text-deep-navy">LGA</label>
            <input id="lga" name="lga" type="text"
              value={form.local_government_area} onChange={(e) => set("local_government_area", e.target.value)}
              placeholder="Jos North" className={inputCls()} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="community" className="mb-1.5 block text-sm font-semibold text-deep-navy">Community</label>
            <input id="community" name="community" type="text"
              value={form.community} onChange={(e) => set("community", e.target.value)}
              placeholder="e.g. Bukuru" className={inputCls()} />
          </div>
          <div>
            <label htmlFor="farming_category" className="mb-1.5 block text-sm font-semibold text-deep-navy">Farming category</label>
            <select id="farming_category" value={form.farming_category}
              onChange={(e) => set("farming_category", e.target.value)}
              className={[inputCls(), "appearance-none"].join(" ")}>
              <option value="">Select category</option>
              {FARMING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required
              value={form.password} onChange={(e) => set("password", e.target.value)}
              placeholder="Minimum 8 characters" className={[inputCls(errors.password), "pr-11"].join(" ")} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-deep-navy/40 hover:text-deep-navy"
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword
                ? <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
            </button>
          </div>
          <FieldError msg={errors.password} />
        </div>
        <div>
          <label htmlFor="password_confirm" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Confirm password <span className="text-red-500">*</span>
          </label>
          <input id="password_confirm" name="password_confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" required
            value={form.password_confirm} onChange={(e) => set("password_confirm", e.target.value)}
            placeholder="Repeat your password" className={inputCls(errors.password_confirm)} />
          <FieldError msg={errors.password_confirm} />
        </div>

        {/* Terms */}
        <div>
          <label htmlFor="terms" className="flex cursor-pointer items-start gap-3">
            <input id="terms" type="checkbox" checked={form.terms}
              onChange={(e) => set("terms", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-deep-navy/30 accent-agro-green" />
            <span className="text-sm text-deep-navy/70">
              I agree to AgroConnect&apos;s{" "}
              <span className="font-semibold text-agro-green">terms of service</span> and understand that my account requires verification before I can access all features.
            </span>
          </label>
          <FieldError msg={errors.terms} />
        </div>

        <button type="submit" disabled={submitting}
          className="w-full rounded-full bg-agro-green py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-55">
          {submitting ? "Creating account…" : "Create Farmer Account"}
        </button>

        <p className="text-center text-xs text-deep-navy/45">
          <Link href="/register" className="hover:text-agro-green">← Back to registration options</Link>
        </p>
      </form>
    </div>
  );
}
