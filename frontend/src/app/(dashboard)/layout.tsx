"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { signOut } from "@/lib/session";
import type { SafeUser } from "@/lib/api";

// Nav links per role — the first matching role wins.
function getNavLinks(user: SafeUser | null) {
  if (!user) return [{ href: "/profile", label: "Profile" }];
  const roles = user.roles;
  if (roles.includes("admin")) {
    return [
      { href: "/admin/cooperatives", label: "Cooperatives" },
      { href: "/admin/pilot", label: "Pilot" },
      { href: "/profile", label: "Profile" },
    ];
  }
  if (roles.includes("cooperative_agent")) {
    return [
      { href: "/agent/dashboard", label: "My Assignments" },
      { href: "/profile", label: "Profile" },
    ];
  }
  if (roles.includes("cooperative")) {
    return [
      { href: "/cooperatives/dashboard", label: "Cooperative" },
      { href: "/cooperatives/membership", label: "Members" },
      { href: "/profile", label: "Profile" },
    ];
  }
  if (roles.includes("farmer")) {
    return [
      { href: "/farmer/listings", label: "My Listings" },
      { href: "/farmer/inventory", label: "Inventory" },
      { href: "/farmer/profile", label: "My Farm" },
      { href: "/profile", label: "Profile" },
      { href: "/cooperatives/membership", label: "Cooperatives" },
    ];
  }
  if (roles.includes("transporter")) {
    return [
      { href: "/transporter/dashboard", label: "Dashboard" },
      { href: "/profile", label: "Profile" },
    ];
  }
  if (roles.includes("buyer")) {
    return [
      { href: "/buyer/dashboard", label: "Dashboard" },
      { href: "/profile", label: "Profile" },
    ];
  }
  return [{ href: "/profile", label: "Profile" }];
}

const FALLBACK_NAV = [{ href: "/profile", label: "Profile" }];

function DashboardNavItems({
  mobile = false,
  user,
}: {
  mobile?: boolean;
  user: SafeUser | null;
}) {
  const pathname = usePathname();
  const links = getNavLinks(user);
  return (
    <>
      {links.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              mobile
                ? `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-agro-green/10 text-agro-green"
                      : "text-deep-navy/70 hover:bg-deep-navy/5"
                  }`
                : `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-agro-green/10 text-agro-green"
                      : "text-deep-navy/70 hover:bg-deep-navy/5 hover:text-deep-navy"
                  }`
            }
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

function NavFallback({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {FALLBACK_NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={
            mobile
              ? "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-deep-navy/70"
              : "rounded-full px-4 py-2 text-sm font-semibold text-deep-navy/70"
          }
        >
          {label}
        </Link>
      ))}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, error } = useDashboardAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState("");

  useEffect(() => {
    const message = sessionStorage.getItem("profile_setup_error");
    if (message) {
      setProfileSetupError(message);
      sessionStorage.removeItem("profile_setup_error");
    }
  }, []);

  async function handleSignOut() {
    setLoggingOut(true);
    await signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg">
        <p className="text-sm text-deep-navy/60">Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg px-4">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-semibold text-agro-green hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg">
        <p className="text-sm text-deep-navy/60">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-soft-bg">
      {/* Skip link */}
      <a href="#dashboard-main" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-deep-navy/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          {/* Logo */}
          <Link href="/" aria-label="AgroConnect home" className="shrink-0">
            <Logo />
          </Link>

          {/* Nav links */}
          <nav
            aria-label="Dashboard navigation"
            className="hidden items-center gap-1 sm:flex"
          >
            <Suspense fallback={<NavFallback />}>
              <DashboardNavItems user={user} />
            </Suspense>
          </nav>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-deep-navy/20 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-60"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>

        {/* Mobile nav */}
        <nav
          aria-label="Mobile dashboard navigation"
          className="flex items-center gap-1 overflow-x-auto px-5 pb-2 sm:hidden"
        >
          <Suspense fallback={<NavFallback mobile />}>
            <DashboardNavItems mobile user={user} />
          </Suspense>
        </nav>
      </header>

      {/* Main */}
      <main id="dashboard-main" className="flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {profileSetupError && (
            <div
              role="alert"
              className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <p>
                You are signed in, but your profile setup could not be
                completed: {profileSetupError}
              </p>
              <button
                type="button"
                onClick={() => setProfileSetupError("")}
                className="shrink-0 font-semibold text-amber-800 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-deep-navy/10 py-5 text-center text-sm text-deep-navy/50">
        &copy; 2026 AgroConnect. All rights reserved.
      </footer>
    </div>
  );
}
