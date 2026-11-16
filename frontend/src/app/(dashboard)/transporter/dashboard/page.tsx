"use client";

import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

export default function TransporterDashboardPage() {
  const { user, loading, error } = useDashboardAuth("transporter");

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
          {user.display_name ?? user.email ?? user.phone_number ?? "Transporter"}
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Your AgroConnect transporter dashboard.
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
                  className="rounded-full bg-fresh-green/15 px-3 py-1 text-xs font-semibold capitalize text-agro-green"
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

      {/* Approval notice */}
      <div className="rounded-2xl border border-harvest-gold/20 bg-harvest-gold/8 px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold">Awaiting admin approval</p>
        <p className="mt-1 text-xs text-amber-700">
          Your transporter profile requires review and approval by an AgroConnect
          administrator before you can receive delivery requests. You will be
          notified by SMS or email when your profile is reviewed.
        </p>
      </div>

      {/* Coming soon features */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: "Delivery Requests",
            description:
              "Browse and accept delivery requests that match your coverage areas and vehicle capacity.",
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
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 5v3h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            ),
            color: "text-agro-green bg-agro-green/10",
            soon: true,
          },
          {
            title: "Active Deliveries",
            description:
              "Track in-progress deliveries, update status and manage pickup and drop-off.",
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ),
            color: "text-harvest-gold bg-harvest-gold/10",
            soon: true,
          },
          {
            title: "Delivery History",
            description:
              "View your completed and past deliveries with status and payment records.",
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
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            ),
            color: "text-deep-navy bg-deep-navy/8",
            soon: true,
          },
          {
            title: "Transporter Profile",
            description:
              "Update your vehicle details, coverage areas and availability status.",
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
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ),
            color: "text-fresh-green bg-fresh-green/15",
            soon: false,
            href: "/profile",
          },
        ].map((item) => {
          const inner = (
            <>
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
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                className="relative flex flex-col rounded-2xl border border-agro-green/20 bg-white p-5 shadow-sm transition-colors hover:border-agro-green/40"
              >
                {inner}
              </Link>
            );
          }

          return (
            <div
              key={item.title}
              className="relative flex flex-col rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm"
            >
              {inner}
            </div>
          );
        })}
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
