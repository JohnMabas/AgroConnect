"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

const COOLDOWN_SECONDS = 60;

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get("token") ?? "";
  const userId = params.get("user_id") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    if (tokenFromUrl && !success && !autoSubmitted) {
      void (async () => {
        setAutoSubmitted(true);
        setSubmitting(true);
        try {
          await authApi.verifyEmail(tokenFromUrl);
          setSuccess(true);
          setTimeout(() => router.push("/login?verified=email"), 2000);
        } catch (err) {
          setError((err as ApiError).message);
        } finally {
          setSubmitting(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await authApi.verifyEmail(token.trim());
      setSuccess(true);
      setTimeout(() => router.push("/login?verified=email"), 2000);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!userId) {
      setError("Cannot resend: user ID is missing. Please register again.");
      return;
    }
    setResending(true);
    setError("");
    try {
      await authApi.resendEmailVerification(userId);
      setCooldown(COOLDOWN_SECONDS);
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
          Check your inbox for a verification link or code, then enter it below.
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
          <div>
            <label
              htmlFor="token"
              className="mb-1.5 block text-sm font-semibold text-deep-navy"
            >
              Verification code or token
            </label>
            <input
              id="token"
              name="token"
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError("");
              }}
              placeholder="Paste the code from your email"
              className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 font-mono text-sm text-deep-navy placeholder:font-sans placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !token.trim()}
            className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Verify email"}
          </button>
        </form>
      )}

      {!success && userId && (
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
              {resending ? "Sending…" : "Resend verification email"}
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
