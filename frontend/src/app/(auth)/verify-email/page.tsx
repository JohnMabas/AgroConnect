"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

const COOLDOWN_SECONDS = 60;

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("user_id") ?? "";
  const email = params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!userId && !email) {
    return (
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 text-center shadow-sm">
        <p className="text-deep-navy/70">
          Invalid verification link. Please{" "}
          <a
            href="/register"
            className="font-semibold text-agro-green hover:underline"
          >
            register again
          </a>
          .
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResendMessage("");
    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.verifyEmail({
        userId: userId || undefined,
        email: email || undefined,
        code,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login?verified=email"), 1500);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setResendMessage("");
    try {
      const response = (await authApi.resendEmailVerification({
        userId: userId || undefined,
        email: email || undefined,
      })) as { data?: { retry_after_seconds?: number } };
      setCooldown(response.data?.retry_after_seconds ?? COOLDOWN_SECONDS);
      setResendMessage("A new verification code has been sent.");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 429) setCooldown(COOLDOWN_SECONDS);
      setError(apiErr.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-harvest-gold/10">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-7 w-7 text-harvest-gold"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Verify your email
        </h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          We sent a 6-digit verification code to{" "}
          <span className="font-semibold text-deep-navy">
            {email || "your email address"}
          </span>
          . Enter it below.
        </p>
      </div>

      {success ? (
        <div
          role="status"
          className="rounded-xl bg-green-50 px-4 py-4 text-center text-sm font-semibold text-green-700"
        >
          ✓ Email verified! Redirecting…
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {resendMessage && (
            <div
              role="status"
              className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {resendMessage}
            </div>
          )}
          <div>
            <label
              htmlFor="otp"
              className="mb-1.5 block text-sm font-semibold text-deep-navy"
            >
              Verification code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                setError("");
                setResendMessage("");
              }}
              placeholder="123456"
              aria-describedby="otp-help"
              className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-deep-navy placeholder:text-deep-navy/30 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
            />
            <p id="otp-help" className="mt-2 text-center text-xs text-deep-navy/50">
              Paste the entire 6-digit code from your email.
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Verify Email"}
          </button>
        </form>
      )}

      {!success && (
        <div className="mt-6 text-center text-sm">
          {cooldown > 0 ? (
            <p className="text-deep-navy/50">
              Resend available in{" "}
              <span className="font-semibold text-deep-navy">{cooldown}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-agro-green hover:underline disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend verification code"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-deep-navy/50">Loading…</p>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
