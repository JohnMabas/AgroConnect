"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const registered = params.get("registered") === "1";
  const verified = params.get("verified");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function successMessage() {
    if (registered) return "Account created! Sign in to continue.";
    if (verified === "phone") return "Phone verified! Sign in to access your account.";
    if (verified === "email") return "Email verified! Sign in to access your account.";
    return null;
  }

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
      const result = await authApi.login({ identifier: identifier.trim(), password });
      // Store the access token in sessionStorage (short-lived).
      sessionStorage.setItem("access_token", result.data.access_token);
      router.push("/account");
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  }

  const msg = successMessage();

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Sign in to AgroConnect
        </h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          No account?{" "}
          <Link
            href="/register"
            className="font-semibold text-agro-green hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>

      {msg && (
        <div
          role="status"
          className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {msg}
        </div>
      )}

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
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
            placeholder="+2348031234567 or you@example.com"
            className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-deep-navy"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Your password"
            className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-deep-navy/50">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
