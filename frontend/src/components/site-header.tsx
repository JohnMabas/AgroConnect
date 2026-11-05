"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const navigation = [
  { label: "Produce", href: "/produce" },
  { label: "Why AgroConnect", href: "#why" },
  { label: "Who it's for", href: "#audience" },
  { label: "How it works", href: "#how-it-works" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-deep-navy/10 bg-soft-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="rounded-lg"
          aria-label="AgroConnect home"
          onClick={() => setIsOpen(false)}
        >
          <Logo />
        </Link>

        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navigation.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-md text-sm font-semibold text-deep-navy/75 transition-colors hover:text-agro-green"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
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
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-deep-navy/15 text-deep-navy md:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
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

      {isOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-deep-navy/10 bg-soft-bg px-5 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block rounded-lg px-3 py-3 text-base font-semibold text-deep-navy/80 transition-colors hover:bg-white hover:text-agro-green"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="pt-2 border-t border-deep-navy/10 mt-2">
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
                className="flex items-center justify-center rounded-full bg-agro-green px-5 py-3 text-base font-semibold text-white"
                onClick={() => setIsOpen(false)}
              >
                Get started
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
