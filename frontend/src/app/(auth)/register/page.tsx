import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create Your Account | AgroConnect",
  description: "Join AgroConnect as a farmer, buyer, cooperative or transporter.",
};

const options = [
  {
    role: "Farmer",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21V9M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 10c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6z" />
      </svg>
    ),
    desc: "List your produce, connect with buyers and manage your farm business.",
    href: "/register/farmer",
    color: "text-agro-green bg-agro-green/10",
    border: "hover:border-agro-green/40",
    cta: "Register as Farmer",
    ctaClass: "bg-agro-green hover:bg-deep-navy text-white",
  },
  {
    role: "Buyer",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    desc: "Discover produce, post buyer requests and negotiate with farmers directly.",
    href: "/register/buyer",
    color: "text-amber-700 bg-harvest-gold/15",
    border: "hover:border-harvest-gold/40",
    cta: "Register as Buyer",
    ctaClass: "bg-deep-navy hover:bg-agro-green text-white",
  },
  {
    role: "Cooperative",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    desc: "Register your cooperative, manage members and assign agents to assist farmers.",
    href: "/register/cooperative",
    color: "text-deep-navy bg-deep-navy/8",
    border: "hover:border-deep-navy/30",
    cta: "Register Cooperative",
    ctaClass: "bg-deep-navy hover:bg-agro-green text-white",
  },
  {
    role: "Transporter",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    desc: "Offer transport services, receive delivery requests and grow your logistics business.",
    href: "/register/transporter",
    color: "text-agro-green bg-fresh-green/15",
    border: "hover:border-fresh-green/40",
    cta: "Register as Transporter",
    ctaClass: "bg-agro-green hover:bg-deep-navy text-white",
  },
];

export default function RegisterPage() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy sm:text-3xl">
          Join AgroConnect
        </h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-agro-green hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => (
          <div
            key={opt.role}
            className={`flex flex-col rounded-2xl border border-deep-navy/10 bg-white p-6 shadow-sm transition-all ${opt.border}`}
          >
            {/* Icon */}
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${opt.color}`}>
              {opt.icon}
            </div>

            {/* Content */}
            <h2 className="mt-4 font-heading text-base font-extrabold text-deep-navy">
              {opt.role}
            </h2>
            <p className="mt-2 flex-1 text-xs leading-5 text-deep-navy/60">
              {opt.desc}
            </p>

            {/* CTA */}
            <Link
              href={opt.href}
              className={`mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${opt.ctaClass}`}
            >
              {opt.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-deep-navy/45">
        By creating an account you agree to AgroConnect&apos;s terms and privacy policy.
      </p>
    </div>
  );
}
