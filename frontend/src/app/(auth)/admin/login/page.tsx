"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";
import { clearAccessToken, loadSession, storeAccessToken } from "@/lib/session";

function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/admin";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      try {
        const session = await loadSession();
        if (cancelled) return;
        if (session && session.user.roles.includes("admin")) {
          router.replace(redirect);
          return;
        }
      } catch {
        // No usable session — stay on the login form.
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    }

    void checkExistingSession();
    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Phone number or email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await authApi.login({
        identifier: identifier.trim(),
        password,
      });
      const { user, access_token } = result.data;

      if (!user.roles.includes("admin")) {
        clearAccessToken();
        setError(
          "This account does not have administrator access. Use an administrator account to continue.",
        );
        return;
      }

      storeAccessToken(access_token);
      router.replace(redirect);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401 && apiErr.data?.user_id) {
        setError(
          "This account's contact details are not verified. Sign in through the regular sign-in page to verify first.",
        );
        return;
      }
      setError(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-7 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          AgroConnect
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy">
          Administrator sign in
        </h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          Restricted to platform administrators.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="admin-identifier"
            className="mb-1.5 block text-sm font-semibold text-deep-navy"
          >
            Phone number or email
          </label>
          <input
            id="admin-identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
            placeholder="+2348031234567 or you@example.com"
            className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
          />
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="mb-1.5 block text-sm font-semibold text-deep-navy"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Your password"
              className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 pr-12 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
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
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? "Checking session…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 border-t border-deep-navy/10 pt-5 text-center text-sm text-deep-navy/55">
        Not an administrator?{" "}
        <Link
          href="/login"
          className="font-semibold text-agro-green hover:underline"
        >
          Sign in to AgroConnect
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-deep-navy/50">Loading…</p>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
