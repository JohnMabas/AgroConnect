"use client";

import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

export default function BuyerDashboardPage() {
  const { user, loading, error } = useDashboardAuth("buyer");

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-deep-navy/60">Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">{error}</p>
        <a
          href="/login"
          className="mt-4 block text-sm font-semibold text-agro-green hover:underline"
        >
          Return to sign in
        </a>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Welcome,{" "}
          {user.display_name ?? user.email ?? user.phone_number ?? "Buyer"}
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Your AgroConnect buyer dashboard.
        </p>
      </div>

      {/* Account status */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
              Account
            </p>
            <p className="mt-1 text-sm text-deep-navy">
              {user.email ?? user.phone_number}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-harvest-gold/15 px-3 py-1 text-xs font-semibold capitalize text-amber-800"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              user.status === "active"
                ? "bg-green-100 text-green-700"
                : user.status === "suspended"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {user.status}
          </span>
        </div>

        {/* Verification indicators */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              user.phone_verified ? "text-green-700" : "text-deep-navy/40"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                user.phone_verified ? "bg-green-500" : "bg-deep-navy/20"
              }`}
            />
            Phone {user.phone_verified ? "verified" : "unverified"}
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              user.email_verified ? "text-green-700" : "text-deep-navy/40"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                user.email_verified ? "bg-green-500" : "bg-deep-navy/20"
              }`}
            />
            Email {user.email_verified ? "verified" : "unverified"}
          </div>
        </div>
      </section>

      {/* Coming soon features */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: "Browse Marketplace",
            description:
              "Discover produce listings from farmers and cooperatives across Nigeria.",
            icon: (
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            ),
            color: "text-agro-green bg-agro-green/10",
            soon: true,
          },
          {
            title: "Post Buyer Requests",
            description:
              "Tell farmers what you need — quantity, price range and delivery preferences.",
            icon: (
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            ),
            color: "text-harvest-gold bg-harvest-gold/10",
            soon: true,
          },
          {
            title: "My Orders",
            description:
              "Track your orders from accepted offer through to delivery.",
            icon: (
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            ),
            color: "text-deep-navy bg-deep-navy/8",
            soon: true,
          },
          {
            title: "Messages",
            description:
              "Communicate directly with farmers and cooperatives.",
            icon: (
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            ),
            color: "text-fresh-green bg-fresh-green/15",
            soon: true,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="relative flex flex-col rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm"
          >
            {item.soon && (
              <span className="absolute right-3 top-3 rounded-full bg-deep-navy/8 px-2 py-0.5 text-xs font-semibold text-deep-navy/50">
                Coming soon
              </span>
            )}
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}
            >
              {item.icon}
            </div>
            <h2 className="mt-3 font-heading text-sm font-extrabold text-deep-navy">
              {item.title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-deep-navy/60">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <section className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          Quick links
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/profile"
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-xs font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            Edit profile
          </Link>
          <Link
            href="/"
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-xs font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            Back to homepage
          </Link>
        </div>
      </section>
    </div>
  );
}
