"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, type SafeUser, type ApiError } from "@/lib/api";
import { Logo } from "@/components/logo";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const res = await authApi.me(token);
        setUser(res.data.user);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.status === 401) {
          // Try to refresh the session using the HttpOnly cookie.
          try {
            const refreshRes = await authApi.refresh();
            sessionStorage.setItem("access_token", refreshRes.data.access_token);
            setUser(refreshRes.data.user);
          } catch {
            sessionStorage.removeItem("access_token");
            router.replace("/login");
          }
        } else {
          setError(apiErr.message);
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchUser();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Best-effort
    }
    sessionStorage.removeItem("access_token");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg">
        <p className="text-sm text-deep-navy/60">Loading your account…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg px-4">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-700">{error}</p>
          <Link
            href="/login"
            className="mt-4 block text-sm font-semibold text-agro-green hover:underline"
          >
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-soft-bg">
      {/* Header */}
      <header className="border-b border-deep-navy/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="AgroConnect home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-deep-navy/20 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-60"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-deep-navy">
            {user.display_name ? `Welcome, ${user.display_name}` : "My Account"}
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">
            Manage your AgroConnect account
          </p>
        </div>

        {/* Account status banner */}
        {user.status === "pending" && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-harvest-gold/40 bg-harvest-gold/10 px-4 py-3 text-sm text-harvest-gold"
          >
            <strong>Account pending.</strong> Please verify your contact information to activate your account.
          </div>
        )}

        <div className="space-y-4">
          {/* Profile card */}
          <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-deep-navy/50">
              Profile
            </h2>
            <dl className="space-y-3">
              <InfoRow label="Display name" value={user.display_name ?? "—"} />
              <InfoRow
                label="Account status"
                value={
                  <StatusBadge status={user.status} />
                }
              />
              <InfoRow
                label="Member since"
                value={new Date(user.created_at).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            </dl>
          </section>

          {/* Contact card */}
          <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-deep-navy/50">
              Contact information
            </h2>
            <dl className="space-y-3">
              {user.phone_number && (
                <InfoRow
                  label="Phone"
                  value={
                    <span className="flex items-center gap-2">
                      {user.phone_number}
                      <VerifiedBadge verified={user.phone_verified} />
                    </span>
                  }
                />
              )}
              {user.email && (
                <InfoRow
                  label="Email"
                  value={
                    <span className="flex items-center gap-2">
                      {user.email}
                      <VerifiedBadge verified={user.email_verified} />
                    </span>
                  }
                />
              )}
            </dl>
          </section>

          {/* Roles card */}
          <section className="rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-deep-navy/50">
              Roles
            </h2>
            {user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-agro-green/10 px-3 py-1 text-sm font-medium capitalize text-agro-green"
                  >
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-deep-navy/50">No roles assigned.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-sm text-deep-navy/60">{label}</dt>
      <dd className="text-right text-sm font-medium text-deep-navy">{value}</dd>
    </div>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="currentColor"
      >
        <path d="M13.485 1.431a1.473 1.473 0 0 0-2.084 0l-6.591 6.588-2.308-2.307a1.473 1.473 0 1 0-2.084 2.085l3.35 3.349a1.473 1.473 0 0 0 2.084 0l7.633-7.633a1.473 1.473 0 0 0 0-2.082z" />
      </svg>
      Verified
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-harvest-gold/10 px-2 py-0.5 text-xs font-semibold text-harvest-gold">
      Unverified
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-harvest-gold/10 text-harvest-gold",
    suspended: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}
