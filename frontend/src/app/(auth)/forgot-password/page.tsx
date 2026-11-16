"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

const COOLDOWN_SECONDS = 60;

function ForgotPasswordForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Please enter your phone number or email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(identifier.trim());
      setCooldown(res.data?.retry_after_seconds ?? COOLDOWN_SECONDS);
      setSubmitted(true);
    } catch (err) {
      const ae = err as ApiError;
      if (ae.status === 422 && ae.errors?.length) {
        setError(ae.errors[0]?.message ?? ae.message);
      } else {
        // Network or server errors should still show neutral message.
        setError(ae.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(identifier.trim());
      setCooldown(res.data?.retry_after_seconds ?? COOLDOWN_SECONDS);
    } catch (err) {
      const ae = err as ApiError;
      if (ae.status === 429) {
        setCooldown(COOLDOWN_SECONDS);
      } else {
        setError(ae.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-agro-green/10">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7 text-agro-green"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            Check your messages
          </h1>
          <p className="mt-2 text-sm text-deep-navy/60">
            If an account exists for{" "}
            <span className="font-semibold text-deep-navy">{identifier}</span>,
            we sent a 6-digit reset code by SMS or email.
          </p>
        </div>

        <div className="rounded-xl border border-agro-green/20 bg-agro-green/5 p-4 text-xs text-deep-navy/70">
          <p className="font-semibold text-deep-navy">What to do next:</p>
          <ol className="mt-1.5 space-y-1 list-decimal list-inside">
            <li>Find the 6-digit code in your SMS or email.</li>
            <li>Visit the password reset page and enter the code.</li>
            <li>Choose a new password.</li>
          </ol>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/reset-password?identifier=${encodeURIComponent(identifier)}`}
            className="inline-flex items-center justify-center rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy"
          >
            Enter reset code
          </Link>

          <div className="text-center text-sm">
            {cooldown > 0 ? (
              <p className="text-deep-navy/50">
                Resend available in{" "}
                <span className="font-semibold text-deep-navy">{cooldown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={submitting}
                className="font-semibold text-agro-green hover:underline disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Resend code"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-deep-navy/10 pt-4 text-center text-sm text-deep-navy/55">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-agro-green hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-harvest-gold/10">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-7 w-7 text-harvest-gold"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          Enter your phone number or email and we will send you a reset code.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="identifier"
            className="mb-1.5 block text-sm font-semibold text-deep-navy"
          >
            Phone number or email
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoFocus
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
            placeholder="+2348031234567 or you@example.com"
            className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? "Sending reset code…" : "Send reset code"}
        </button>
      </form>

      <div className="mt-6 border-t border-deep-navy/10 pt-5 text-center text-sm text-deep-navy/55">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-agro-green hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-deep-navy/50">Loading…</p>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
