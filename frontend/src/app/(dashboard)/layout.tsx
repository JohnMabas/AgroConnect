"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { authApi } from "@/lib/api";

const NAV_LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/farmer/profile", label: "My Farm" },
  { href: "/cooperatives/membership", label: "Cooperatives" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // best-effort
    }
    sessionStorage.removeItem("access_token");
    router.push("/login");
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
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-agro-green/10 text-agro-green"
                      : "text-deep-navy/70 hover:bg-deep-navy/5 hover:text-deep-navy"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
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
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-agro-green/10 text-agro-green"
                    : "text-deep-navy/70 hover:bg-deep-navy/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main */}
      <main id="dashboard-main" className="flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-deep-navy/10 py-5 text-center text-sm text-deep-navy/50">
        &copy; 2026 AgroConnect. All rights reserved.
      </footer>
    </div>
  );
}
