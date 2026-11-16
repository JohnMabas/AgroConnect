"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

const AG_FOCUS = [
  "Cereals & Grains",
  "Vegetables",
  "Fruits & Horticulture",
  "Livestock & Dairy",
  "Poultry",
  "Fishery & Aquaculture",
  "Root & Tuber Crops",
  "Oil Seeds",
  "Mixed / General Agriculture",
];

interface AdminForm {
  display_name: string;
  phone_number: string;
  email: string;
  password: string;
  password_confirm: string;
  position: string;
}

interface CoopForm {
  cooperative_name: string;
  registration_number: string;
  agricultural_focus: string;
  state_or_region: string;
  local_government_area: string;
  community: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  description: string;
}

interface FormState {
  admin: AdminForm;
  coop: CoopForm;
  terms: boolean;
}

type ErrMap = Partial<Record<string, string>>;

const INIT: FormState = {
  admin: { display_name: "", phone_number: "", email: "", password: "", password_confirm: "", position: "" },
  coop: { cooperative_name: "", registration_number: "", agricultural_focus: "", state_or_region: "", local_government_area: "", community: "", address: "", contact_phone: "", contact_email: "", description: "" },
  terms: false,
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1 text-xs font-medium text-red-600">{msg}</p>;
}

function cls(err?: string) {
  return [
    "w-full rounded-xl border px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/35",
    "outline-none transition-colors focus:ring-2 focus:ring-agro-green/30",
    err ? "border-red-400 bg-red-50 focus:border-red-400" : "border-deep-navy/20 bg-white focus:border-agro-green",
  ].join(" ");
}

type Step = "admin" | "coop" | "submitted";

export default function CooperativeRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INIT);
  const [errors, setErrors] = useState<ErrMap>({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("admin");
  const [showPassword, setShowPassword] = useState(false);

  function setAdmin(field: keyof AdminForm, val: string) {
    setForm((f) => ({ ...f, admin: { ...f.admin, [field]: val } }));
    setErrors((e) => { const n = { ...e }; delete n[`admin.${field}`]; return n; });
    setGlobalError("");
  }

  function setCoop(field: keyof CoopForm, val: string) {
    setForm((f) => ({ ...f, coop: { ...f.coop, [field]: val } }));
    setErrors((e) => { const n = { ...e }; delete n[`coop.${field}`]; return n; });
    setGlobalError("");
  }

  function validateAdmin() {
    const e: ErrMap = {};
    if (!form.admin.display_name.trim()) e["admin.display_name"] = "Full name is required.";
    if (!form.admin.phone_number && !form.admin.email) {
      e["admin.phone_number"] = "Provide at least a phone number or email.";
      e["admin.email"] = "Provide at least a phone number or email.";
    }
    if (!form.admin.password) e["admin.password"] = "Password is required.";
    else if (form.admin.password.length < 8) e["admin.password"] = "Minimum 8 characters.";
    if (form.admin.password !== form.admin.password_confirm) e["admin.password_confirm"] = "Passwords do not match.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  function validateCoop() {
    const e: ErrMap = {};
    if (!form.coop.cooperative_name.trim()) e["coop.cooperative_name"] = "Cooperative name is required.";
    if (!form.coop.state_or_region.trim()) e["coop.state_or_region"] = "State / region is required.";
    if (!form.terms) e["terms"] = "You must accept the terms.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateCoop()) return;
    setSubmitting(true);
    setGlobalError("");

    try {
      // 1. Register the administrator account
      const regResult = await authApi.register({
        display_name: form.admin.display_name.trim() || undefined,
        phone_number: form.admin.phone_number || undefined,
        email: form.admin.email || undefined,
        password: form.admin.password,
        password_confirm: form.admin.password_confirm,
      });

      const { user } = regResult.data;

      // 2. If verification is required, we can't create the coop yet.
      // We'll direct to verification first.
      if (regResult.data.phone_otp_pending || regResult.data.email_verification_pending) {
        // Store coop data to submit after verification (session storage)
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "pending_cooperative",
            JSON.stringify({ ...form.coop, user_id: user.id }),
          );
        }
        const userId = user.id;
        if (regResult.data.phone_otp_pending) {
          router.push(`/verify-phone?user_id=${userId}&next=cooperative`);
        } else {
          router.push(
            `/verify-email?user_id=${userId}&email=${encodeURIComponent(user.email ?? "")}&next=cooperative`,
          );
        }
        return;
      }

      // 3. If no verification needed, redirect to login with a note.
      setStep("submitted");
    } catch (err) {
      const ae = err as ApiError;
      if (ae.errors?.length) {
        const fe: ErrMap = {};
        ae.errors.forEach((x) => { fe[`admin.${x.field}`] = x.message; });
        setErrors(fe);
        setStep("admin"); // go back to show errors
      } else {
        setGlobalError(ae.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Submitted success state ───────────────────────────────────────────────
  if (step === "submitted") {
    return (
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-agro-green/10">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-heading text-xl font-extrabold text-deep-navy">
          Application Submitted
        </h1>
        <p className="mt-3 text-sm text-deep-navy/60">
          Your administrator account has been created. Please verify your contact details, then sign in to complete your cooperative registration through your dashboard.
        </p>
        <div className="mt-5 rounded-xl border border-harvest-gold/20 bg-harvest-gold/8 p-4 text-left text-xs text-amber-800">
          <p className="font-semibold">What happens next?</p>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            <li>Verify your phone or email (check your messages).</li>
            <li>Sign in to AgroConnect.</li>
            <li>Complete your cooperative registration from your dashboard.</li>
            <li>AgroConnect will review and approve your cooperative. This is not automatic.</li>
          </ol>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/login" className="rounded-full bg-agro-green px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy">
            Sign In
          </Link>
          <Link href="/cooperatives" className="rounded-full border border-deep-navy/15 px-6 py-3 text-sm font-bold text-deep-navy transition-colors hover:border-agro-green/30 hover:text-agro-green">
            Learn about Cooperatives
          </Link>
        </div>
      </div>
    );
  }

  // ─── Cooperative info form ─────────────────────────────────────────────────
  if (step === "coop") {
    return (
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
        <button type="button" onClick={() => setStep("admin")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-deep-navy/60 hover:text-agro-green">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Back to administrator details
        </button>
        <h1 className="font-heading text-xl font-extrabold text-deep-navy">Cooperative Details</h1>
        <p className="mt-1 text-sm text-deep-navy/55">Step 2 of 2</p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {globalError && (
            <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{globalError}</div>
          )}

          <div>
            <label htmlFor="cooperative_name" className="mb-1.5 block text-sm font-semibold text-deep-navy">
              Cooperative name <span className="text-red-500">*</span>
            </label>
            <input id="cooperative_name" type="text" required
              value={form.coop.cooperative_name} onChange={(e) => setCoop("cooperative_name", e.target.value)}
              placeholder="e.g. Plateau Farmers Cooperative" className={cls(errors["coop.cooperative_name"])} />
            <FieldError msg={errors["coop.cooperative_name"]} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="registration_number" className="mb-1.5 block text-sm font-semibold text-deep-navy">Registration number</label>
              <input id="registration_number" type="text"
                value={form.coop.registration_number} onChange={(e) => setCoop("registration_number", e.target.value)}
                placeholder="Official reg. number" className={cls()} />
            </div>
            <div>
              <label htmlFor="agricultural_focus" className="mb-1.5 block text-sm font-semibold text-deep-navy">Agricultural focus</label>
              <select id="agricultural_focus" value={form.coop.agricultural_focus}
                onChange={(e) => setCoop("agricultural_focus", e.target.value)}
                className={[cls(), "appearance-none"].join(" ")}>
                <option value="">Select focus</option>
                {AG_FOCUS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="state_or_region" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                State / Region <span className="text-red-500">*</span>
              </label>
              <input id="state_or_region" type="text" required
                value={form.coop.state_or_region} onChange={(e) => setCoop("state_or_region", e.target.value)}
                placeholder="Plateau State" className={cls(errors["coop.state_or_region"])} />
              <FieldError msg={errors["coop.state_or_region"]} />
            </div>
            <div>
              <label htmlFor="coop_lga" className="mb-1.5 block text-sm font-semibold text-deep-navy">LGA</label>
              <input id="coop_lga" type="text"
                value={form.coop.local_government_area} onChange={(e) => setCoop("local_government_area", e.target.value)}
                placeholder="Jos North" className={cls()} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="coop_community" className="mb-1.5 block text-sm font-semibold text-deep-navy">Community</label>
              <input id="coop_community" type="text"
                value={form.coop.community} onChange={(e) => setCoop("community", e.target.value)}
                placeholder="e.g. Bukuru" className={cls()} />
            </div>
            <div>
              <label htmlFor="coop_address" className="mb-1.5 block text-sm font-semibold text-deep-navy">Office address</label>
              <input id="coop_address" type="text"
                value={form.coop.address} onChange={(e) => setCoop("address", e.target.value)}
                placeholder="e.g. No. 12 Farm Road" className={cls()} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="coop_phone" className="mb-1.5 block text-sm font-semibold text-deep-navy">Contact phone</label>
              <input id="coop_phone" type="tel"
                value={form.coop.contact_phone} onChange={(e) => setCoop("contact_phone", e.target.value)}
                placeholder="+2348031234567" className={cls()} />
            </div>
            <div>
              <label htmlFor="coop_email" className="mb-1.5 block text-sm font-semibold text-deep-navy">Contact email</label>
              <input id="coop_email" type="email"
                value={form.coop.contact_email} onChange={(e) => setCoop("contact_email", e.target.value)}
                placeholder="coop@example.com" className={cls()} />
            </div>
          </div>

          <div>
            <label htmlFor="coop_description" className="mb-1.5 block text-sm font-semibold text-deep-navy">Brief description</label>
            <textarea id="coop_description" rows={3}
              value={form.coop.description} onChange={(e) => setCoop("description", e.target.value)}
              placeholder="Describe your cooperative's activities and mission…"
              className={[cls(), "resize-none"].join(" ")} />
          </div>

          <div className="rounded-xl border border-harvest-gold/20 bg-harvest-gold/8 p-4 text-xs text-amber-800">
            <strong>Note:</strong> Your application will be reviewed by AgroConnect administrators. Cooperative registration is not automatic. You will be notified of the review outcome.
          </div>

          <label htmlFor="terms" className="flex cursor-pointer items-start gap-3">
            <input id="terms" type="checkbox" checked={form.terms}
              onChange={(e) => setForm((f) => ({ ...f, terms: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-deep-navy/30 accent-agro-green" />
            <span className="text-sm text-deep-navy/70">
              I agree to AgroConnect&apos;s <span className="font-semibold text-agro-green">terms of service</span> and understand that cooperative approval requires admin review.
            </span>
          </label>
          <FieldError msg={errors["terms"]} />

          <button type="submit" disabled={submitting}
            className="w-full rounded-full bg-agro-green py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-55">
            {submitting ? "Submitting application…" : "Submit Application"}
          </button>
        </form>
      </div>
    );
  }

  // ─── Administrator details form (step 1) ──────────────────────────────────
  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-deep-navy/8 text-deep-navy">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">Register Your Cooperative</h1>
        <p className="mt-1 text-sm text-deep-navy/55">Step 1 of 2 — Administrator account</p>
        <p className="mt-1.5 text-xs text-deep-navy/45">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-agro-green hover:underline">Sign in</Link>
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (validateAdmin()) setStep("coop");
        }}
        noValidate className="space-y-5">
        {errors.global && (
          <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.global}</div>
        )}

        <div>
          <label htmlFor="admin_name" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Administrator full name <span className="text-red-500">*</span>
          </label>
          <input id="admin_name" type="text" autoComplete="name" required
            value={form.admin.display_name} onChange={(e) => setAdmin("display_name", e.target.value)}
            placeholder="e.g. John Danjuma" className={cls(errors["admin.display_name"])} />
          <FieldError msg={errors["admin.display_name"]} />
        </div>

        <div>
          <label htmlFor="admin_position" className="mb-1.5 block text-sm font-semibold text-deep-navy">Position in cooperative</label>
          <input id="admin_position" type="text"
            value={form.admin.position} onChange={(e) => setAdmin("position", e.target.value)}
            placeholder="e.g. Chairman, Secretary" className={cls()} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-deep-navy">
            Contact <span className="font-normal text-deep-navy/55">— phone, email, or both</span>
          </legend>
          <div className="space-y-3">
            <div>
              <label htmlFor="admin_phone" className="mb-1 block text-xs font-medium text-deep-navy/70">Phone number</label>
              <input id="admin_phone" type="tel" autoComplete="tel"
                value={form.admin.phone_number} onChange={(e) => setAdmin("phone_number", e.target.value)}
                placeholder="+2348031234567" className={cls(errors["admin.phone_number"])} />
              <FieldError msg={errors["admin.phone_number"]} />
            </div>
            <div>
              <label htmlFor="admin_email" className="mb-1 block text-xs font-medium text-deep-navy/70">Email address</label>
              <input id="admin_email" type="email" autoComplete="email"
                value={form.admin.email} onChange={(e) => setAdmin("email", e.target.value)}
                placeholder="admin@example.com" className={cls(errors["admin.email"])} />
              <FieldError msg={errors["admin.email"]} />
            </div>
          </div>
        </fieldset>

        <div>
          <label htmlFor="admin_password" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input id="admin_password" type={showPassword ? "text" : "password"} autoComplete="new-password" required
              value={form.admin.password} onChange={(e) => setAdmin("password", e.target.value)}
              placeholder="Minimum 8 characters" className={[cls(errors["admin.password"]), "pr-11"].join(" ")} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-deep-navy/40 hover:text-deep-navy"
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword
                ? <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
            </button>
          </div>
          <FieldError msg={errors["admin.password"]} />
        </div>
        <div>
          <label htmlFor="admin_password_confirm" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Confirm password <span className="text-red-500">*</span>
          </label>
          <input id="admin_password_confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" required
            value={form.admin.password_confirm} onChange={(e) => setAdmin("password_confirm", e.target.value)}
            placeholder="Repeat your password" className={cls(errors["admin.password_confirm"])} />
          <FieldError msg={errors["admin.password_confirm"]} />
        </div>

        <button type="submit"
          className="w-full rounded-full bg-agro-green py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy">
          Continue to Cooperative Details →
        </button>
        <p className="text-center text-xs text-deep-navy/45">
          <Link href="/register" className="hover:text-agro-green">← Back to registration options</Link>
        </p>
      </form>
    </div>
  );
}
