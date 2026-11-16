"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Farmers", href: "/farmers" },
  { label: "Buyers", href: "/buyers" },
  { label: "Cooperatives", href: "/cooperatives" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-deep-navy/10 bg-soft-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        {/* Logo */}
        <Link
          href="/"
          className="rounded-lg shrink-0"
          aria-label="AgroConnect home"
          onClick={() => setIsOpen(false)}
        >
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    isActive(item.href)
                      ? "bg-agro-green/10 text-agro-green"
                      : "text-deep-navy/70 hover:text-agro-green hover:bg-agro-green/8",
                  ].join(" ")}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex shrink-0">
          <Link
            href="/login"
            className="text-sm font-semibold text-deep-navy/70 transition-colors hover:text-agro-green"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-deep-navy/15 text-deep-navy lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {isOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {isOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-deep-navy/10 bg-soft-bg px-5 py-4 lg:hidden"
        >
          <ul className="flex flex-col gap-0.5">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "block rounded-lg px-3 py-3 text-base font-semibold transition-colors",
                    isActive(item.href)
                      ? "bg-agro-green/10 text-agro-green"
                      : "text-deep-navy/80 hover:bg-white hover:text-agro-green",
                  ].join(" ")}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}

            <li className="mt-2 border-t border-deep-navy/10 pt-2">
              <Link
                href="/login"
                className="block rounded-lg px-3 py-3 text-base font-semibold text-deep-navy/80 transition-colors hover:bg-white hover:text-agro-green"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                href="/register"
                className="flex items-center justify-center rounded-full bg-agro-green px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-deep-navy"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
