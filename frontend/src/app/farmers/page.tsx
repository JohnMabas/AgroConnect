import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "For Farmers | AgroConnect",
  description:
    "AgroConnect helps farmers find reliable buyers, manage produce listings, negotiate better prices and track their earnings.",
};

const benefits = [
  {
    icon: "🛒",
    title: "Direct Access to Buyers",
    desc: "Connect directly with wholesalers, retailers and processors across Nigeria — no middlemen eating your margins.",
  },
  {
    icon: "📋",
    title: "Publish Produce Listings",
    desc: "List your available produce with full details: quantity, unit, price, harvest date, location and quality description.",
  },
  {
    icon: "📦",
    title: "Inventory Management",
    desc: "Track available, reserved and sold quantities in real time. Never oversell or lose track of your stock.",
  },
  {
    icon: "💬",
    title: "Direct Buyer Communication",
    desc: "Chat securely with interested buyers directly on the platform. Discuss price, quantity and delivery terms.",
  },
  {
    icon: "🤝",
    title: "Structured Negotiations",
    desc: "Receive formal offers from buyers. Accept, reject or counter with your preferred terms. Full history preserved.",
  },
  {
    icon: "💳",
    title: "Secure Orders & Payments",
    desc: "Once an offer is agreed, an order is created and payment is processed securely through Paystack.",
  },
  {
    icon: "📊",
    title: "Market Intelligence",
    desc: "Access aggregated market price data to understand what other farmers are selling for in your region.",
  },
  {
    icon: "🛡️",
    title: "Farmer Protection",
    desc: "You retain full ownership of your profile, listings and harvest records — always.",
  },
  {
    icon: "🏘️",
    title: "Cooperative Assistance",
    desc: "Join a registered cooperative to get help from trained agents who can assist with listings, communication and buyers.",
  },
  {
    icon: "📱",
    title: "Rural Accessibility",
    desc: "AgroConnect works on any smartphone. USSD access for basic phones is in development.",
  },
];

const faqs = [
  {
    q: "Is AgroConnect free for farmers?",
    a: "Registration is free. AgroConnect may introduce service fees when the platform is fully operational. Any fees will be clearly communicated before you are charged.",
  },
  {
    q: "Do I need a smartphone to use AgroConnect?",
    a: "Currently, the web platform requires a smartphone or computer with internet access. We are developing USSD access for farmers with basic phones.",
  },
  {
    q: "Can a cooperative agent manage my listings?",
    a: "Only if you explicitly consent. Agents work on behalf of approved cooperatives and can only assist after you grant them access. You can revoke access at any time.",
  },
  {
    q: "How does payment work?",
    a: "Buyers pay through the platform using Paystack hosted checkout. Once payment is confirmed, the funds process and the order moves forward. Payment protection details will be published when the payment feature launches.",
  },
];

export default function FarmersPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-soft-bg">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-fresh-green/12 blur-3xl" />
          <div className="relative mx-auto max-w-7xl grid gap-14 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
                For Farmers
              </p>
              <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-deep-navy sm:text-5xl">
                Find More Buyers for Your Produce.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-deep-navy/65">
                AgroConnect gives farmers a direct line to verified buyers across Nigeria. List your produce, negotiate your price and get paid — all in one platform.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register/farmer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy"
                >
                  Register as Farmer
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-deep-navy/15 bg-white px-6 py-3.5 text-sm font-bold text-deep-navy transition-colors hover:border-agro-green/30 hover:text-agro-green"
                >
                  See How It Works
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl shadow-2xl shadow-deep-navy/10">
              <Image
                src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80"
                alt="African farmer working in a lush green farm field"
                width={800}
                height={520}
                className="h-72 w-full object-cover object-center opacity-90"
                priority
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Benefits</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                Everything You Need to Sell Your Produce
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-2xl border border-deep-navy/8 bg-soft-bg/60 p-5">
                  <span className="text-2xl" role="img" aria-label={b.title}>{b.icon}</span>
                  <h3 className="mt-3 font-heading text-sm font-bold text-deep-navy">{b.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-deep-navy/60">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cooperative assistance */}
        <section className="bg-soft-bg py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Cooperative Support</p>
                <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
                  Get Support from Your Cooperative
                </h2>
                <p className="mt-4 text-sm leading-7 text-deep-navy/65">
                  If you are a member of a registered agricultural cooperative, trained agents can assist you with your AgroConnect account — with your explicit consent. Agents help farmers who may have limited access to smartphones or internet.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Agent can help you create and update listings",
                    "Agent can communicate with buyers on your behalf",
                    "You review and approve any important decisions",
                    "All agent actions are recorded in a transparent audit log",
                    "You can revoke agent access at any time",
                  ].map((pt) => (
                    <li key={pt} className="flex items-start gap-3">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-sm text-deep-navy/70">{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/cooperatives"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-agro-green transition-colors hover:text-deep-navy"
                >
                  Learn about cooperatives
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
              <div className="overflow-hidden rounded-3xl">
                <Image
                  src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=700&q=80"
                  alt="Farmers in a cooperative meeting"
                  width={700}
                  height={440}
                  className="h-64 w-full object-cover object-center opacity-85"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Farmer protection */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="rounded-3xl border border-agro-green/15 bg-agro-green/5 p-8 lg:p-12">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-4xl" role="img" aria-label="Shield">🛡️</span>
                <h2 className="mt-4 font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
                  Your Farm. Your Data. Your Control.
                </h2>
                <p className="mt-4 text-sm leading-7 text-deep-navy/65">
                  AgroConnect is built on the principle that farmers own their profiles, listings and harvest records. No cooperative, agent or third party can override your decisions.
                </p>
              </div>
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: "Own your data", desc: "Your profile and farm records belong to you — always." },
                  { title: "Agent consent required", desc: "No agent can access your account without your explicit permission." },
                  { title: "Revoke access anytime", desc: "Remove an agent's access from your account at any moment." },
                  { title: "Transparent audit log", desc: "Every agent action is recorded so you always know what happened." },
                  { title: "Secure authentication", desc: "Your account is protected by verified phone or email login." },
                  { title: "Report misconduct", desc: "Report any agent or buyer misconduct directly through the platform." },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-agro-green/15 bg-white p-5">
                    <h3 className="font-heading text-sm font-bold text-deep-navy">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-deep-navy/60">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-soft-bg py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">FAQ</p>
              <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-deep-navy">
                Common Questions from Farmers
              </h2>
            </div>
            <div className="mt-10 space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-deep-navy/8 bg-white p-6">
                  <h3 className="font-heading text-sm font-bold text-deep-navy">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-6 text-deep-navy/60">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-agro-green py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 text-center sm:px-8 lg:px-10">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white">
              Join AgroConnect as a Farmer Today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">
              Register for free and start connecting with buyers across Nigeria.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register/farmer"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-bold text-agro-green shadow-lg transition-colors hover:bg-soft-bg"
              >
                Register as Farmer
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                How It Works
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
