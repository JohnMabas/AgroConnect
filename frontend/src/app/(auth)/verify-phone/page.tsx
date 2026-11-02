"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

const COOLDOWN_SECONDS = 60;

export default function VerifyPhonePage() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("user_id") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!userId) {
    return (
      <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 text-center shadow-sm">
        <p className="text-deep-navy/70">
          Invalid link. Please{" "}
          <a href="/register" className="font-semibold text-agro-green hover:underline">
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
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.verifyPhone(userId, otp);
      setSuccess(true);
      setTimeout(() => router.push("/login?verified=phone"), 1500);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      await authApi.resendPhoneOtp(userId);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 429) {
        setCooldown(COOLDOWN_SECONDS);
      }
      setError(apiErr.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-agro-green/10">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-7 w-7 text-agro-green"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Verify your phone
        </h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          We sent a 6-digit code to your phone number. Enter it below.
        </p>
      </div>

      {success ? (
        <div
          role="status"
          className="rounded-xl bg-green-50 px-4 py-4 text-center text-sm font-semibold text-green-700"
        >
          ✓ Phone verified! Redirecting…
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
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(v);
                setError("");
              }}
              placeholder="123456"
              className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-deep-navy placeholder:text-deep-navy/30 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || otp.length !== 6}
            className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Verify code"}
          </button>
        </form>
      )}

      {!success && (
        <div className="mt-6 text-center text-sm">
          {cooldown > 0 ? (
            <p className="text-deep-navy/50">
              Resend available in{" "}
              <span className="font-semibold text-deep-navy">
                {cooldown}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-agro-green hover:underline disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
