"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1 text-xs font-medium text-red-600">{msg}</p>;
}

function inputCls(err?: string) {
  return [
    "w-full rounded-xl border px-4 py-3 text-sm text-deep-navy",
    "placeholder:text-deep-navy/35 outline-none transition-colors focus:ring-2 focus:ring-agro-green/30",
    err
      ? "border-red-400 bg-red-50 focus:border-red-400"
      : "border-deep-navy/20 bg-white focus:border-agro-green",
  ].join(" ");
}

// ─── Guess initial mode from query-string identifier ─────────────────────────
function guessMode(value: string): "phone" | "email" {
  return value.includes("@") ? "email" : "phone";
}

// ─── Main form ────────────────────────────────────────────────────────────────

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefill = params.get("identifier") ?? "";

  const [mode, setMode] = useState<"phone" | "email">(guessMode(prefill));
  const [identifier, setIdentifier] = useState(prefill);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"identifier" | "code" | "password" | "password_confirm" | "global", string>>
  >({});

  function switchMode(next: "phone" | "email") {
    setMode(next);
    setIdentifier("");
    setErrors((e) => { const n = { ...e }; delete n.identifier; delete n.global; return n; });
  }

  function clearField(field: "identifier" | "code" | "password" | "password_confirm") {
    setErrors((e) => { const n = { ...e }; delete n[field]; delete n.global; return n; });
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!identifier.trim()) {
      e.identifier = mode === "phone"
        ? "Phone number is required."
        : "Email address is required.";
    }
    if (!code || !/^\d{6}$/.test(code))
      e.code = "Please enter the 6-digit reset code.";
    if (!password) e.password = "New password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (password.length > 128) e.password = "Password must be at most 128 characters.";
    if (password !== passwordConfirm) e.password_confirm = "Passwords do not match.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await authApi.resetPassword({
        identifier: identifier.trim(),
        code,
        password,
        password_confirm: passwordConfirm,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login?reset=1"), 1800);
    } catch (err) {
      const ae = err as ApiError;
      if (ae.errors?.length) {
        const fe: typeof errors = {};
        ae.errors.forEach((x) => { fe[x.field as keyof typeof errors] = x.message; });
        setErrors(fe);
      } else {
        setErrors({ global: ae.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-agro-green/10">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-heading text-xl font-extrabold text-deep-navy">Password updated!</h1>
        <p className="mt-2 text-sm text-deep-navy/60">Your password has been reset. Redirecting to sign in…</p>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-harvest-gold/10">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 text-harvest-gold" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">Set a new password</h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          Enter the 6-digit code from your SMS or email, then choose a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errors.global && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.global}
          </div>
        )}

        {/* ── Phone / Email toggle ─────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-sm font-semibold text-deep-navy">
            Account registered with
          </p>

          {/* Toggle buttons */}
          <div className="flex rounded-xl border border-deep-navy/15 bg-soft-bg p-1" role="group" aria-label="Select identifier type">
            <button
              type="button"
              onClick={() => switchMode("phone")}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                mode === "phone"
                  ? "bg-white text-agro-green shadow-sm"
                  : "text-deep-navy/55 hover:text-deep-navy",
              ].join(" ")}
            >
              {/* Phone icon */}
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              Phone number
            </button>

            <button
              type="button"
              onClick={() => switchMode("email")}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                mode === "email"
                  ? "bg-white text-agro-green shadow-sm"
                  : "text-deep-navy/55 hover:text-deep-navy",
              ].join(" ")}
            >
              {/* Email icon */}
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              Email address
            </button>
          </div>

          {/* Input — rendered after toggle so label and type update together */}
          <div className="mt-3">
            {mode === "phone" ? (
              <>
                <label htmlFor="identifier" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Phone number
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); clearField("identifier"); }}
                  placeholder="+2348031234567"
                  className={inputCls(errors.identifier)}
                />
              </>
            ) : (
              <>
                <label htmlFor="identifier" className="mb-1.5 block text-sm font-semibold text-deep-navy">
                  Email address
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); clearField("identifier"); }}
                  placeholder="you@example.com"
                  className={inputCls(errors.identifier)}
                />
              </>
            )}
            <FieldError msg={errors.identifier} />
          </div>
        </div>

        {/* ── Reset code ───────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Reset code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              clearField("code");
            }}
            placeholder="6-digit code"
            className={[inputCls(errors.code), "text-center text-xl font-bold tracking-[0.4em]"].join(" ")}
          />
          <FieldError msg={errors.code} />
          <p className="mt-1.5 text-center text-xs text-deep-navy/45">
            {mode === "phone"
              ? "Check your SMS messages for the 6-digit code."
              : "Check your email inbox for the 6-digit code."}
          </p>
        </div>

        {/* ── New password ─────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearField("password"); }}
              placeholder="Minimum 8 characters"
              className={[inputCls(errors.password), "pr-11"].join(" ")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-deep-navy/40 transition-colors hover:text-deep-navy"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          <FieldError msg={errors.password} />
        </div>

        {/* ── Confirm password ─────────────────────────────────────────────── */}
        <div>
          <label htmlFor="password_confirm" className="mb-1.5 block text-sm font-semibold text-deep-navy">
            Confirm new password
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => { setPasswordConfirm(e.target.value); clearField("password_confirm"); }}
            placeholder="Repeat your new password"
            className={inputCls(errors.password_confirm)}
          />
          <FieldError msg={errors.password_confirm} />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? "Resetting password…" : "Reset password"}
        </button>
      </form>

      <div className="mt-6 border-t border-deep-navy/10 pt-5 text-center text-sm text-deep-navy/55">
        Didn&apos;t get a code?{" "}
        <Link href="/forgot-password" className="font-semibold text-agro-green hover:underline">
          Request a new one
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-deep-navy/50">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
