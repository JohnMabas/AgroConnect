import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "For Buyers | AgroConnect",
  description:
    "AgroConnect helps buyers discover reliable agricultural suppliers, negotiate prices and manage orders from farm to delivery.",
};

const benefits = [
  {
    icon: "🔍",
    title: "Discover Verified Produce",
    desc: "Browse published listings from verified farmers across Nigeria. Filter by produce type, location, quantity and price.",
  },
  {
    icon: "👨‍🌾",
    title: "Search Reliable Suppliers",
    desc: "Find farmers who consistently supply the produce you need. View their profile, listings and ratings.",
  },
  {
    icon: "📝",
    title: "Post Buyer Requests",
    desc: "Tell farmers exactly what you need. Post a buyer request with your required produce, quantity, location and deadline.",
  },
  {
    icon: "💬",
    title: "Direct Farmer Communication",
    desc: "Chat directly with farmers to discuss produce quality, quantity adjustments and collection arrangements.",
  },
  {
    icon: "🤝",
    title: "Negotiate Offers",
    desc: "Submit structured offers with your price, quantity and delivery terms. Negotiate in a transparent, recorded process.",
  },
  {
    icon: "📋",
    title: "Manage Orders",
    desc: "Track all your orders from creation through payment to delivery completion in one place.",
  },
  {
    icon: "💳",
    title: "Secure Payments",
    desc: "Pay securely through Paystack hosted checkout. Inventory is reserved the moment your order is created.",
  },
  {
    icon: "🚛",
    title: "Arrange Delivery",
    desc: "Request delivery coordination through AgroConnect's transport network. Track delivery status in real time.",
  },
];

const requestProcess = [
  {
    num: "01",
    title: "Post Your Requirement",
    desc: "Describe what you need: produce type, quantity, unit, delivery location, required date and optional target price.",
  },
  {
    num: "02",
    title: "Farmers Discover Your Request",
    desc: "Matching farmers and cooperatives can discover your open buyer request on the platform.",
  },
  {
    num: "03",
    title: "Receive and Review Offers",
    desc: "Interested farmers submit structured offers responding to your request. Review and compare them.",
  },
  {
    num: "04",
    title: "Negotiate and Agree",
    desc: "Accept an offer, make a counteroffer or decline. Reach an agreement and proceed to order and payment.",
  },
];

export default function BuyersPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-soft-bg">
          <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-16 h-96 w-96 rounded-full bg-harvest-gold/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl grid gap-14 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
                For Buyers
              </p>
              <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-deep-navy sm:text-5xl">
                Discover Reliable Agricultural Suppliers.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-deep-navy/65">
                AgroConnect connects you directly with verified farmers and cooperatives. Search for the produce you need, negotiate fair prices and arrange reliable delivery.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register/buyer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy"
                >
                  Register as Buyer
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center rounded-full border border-deep-navy/15 bg-white px-6 py-3.5 text-sm font-bold text-deep-navy transition-colors hover:border-agro-green/30 hover:text-agro-green"
                >
                  Browse Marketplace
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl shadow-2xl shadow-deep-navy/10">
              <Image
                src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80"
                alt="Buyer inspecting fresh agricultural produce at market"
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
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy">
                Your Agricultural Supply Chain, Simplified
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Buyer requests */}
        <section className="bg-soft-bg py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Buyer Requests</p>
                <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
                  Tell Farmers What You Need
                </h2>
                <p className="mt-4 text-sm leading-7 text-deep-navy/65">
                  Instead of only browsing what farmers have, you can post a buyer request telling the market exactly what you are looking for. Matching farmers will discover your request and respond with offers.
                </p>
                <ol className="mt-8 space-y-5">
                  {requestProcess.map((step) => (
                    <li key={step.num} className="flex items-start gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agro-green/10 font-heading text-sm font-black text-agro-green">
                        {step.num}
                      </span>
                      <div>
                        <h3 className="font-heading text-sm font-bold text-deep-navy">{step.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-deep-navy/60">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <Link
                  href="/register/buyer"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy"
                >
                  Start Posting Requests
                </Link>
              </div>
              <div className="overflow-hidden rounded-3xl">
                <Image
                  src="https://images.unsplash.com/photo-1573164574001-518958d9baa2?w=700&q=80"
                  alt="Agricultural buyer reviewing produce samples"
                  width={700}
                  height={440}
                  className="h-64 w-full object-cover object-center opacity-85"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trust section */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Quality & Trust</p>
              <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
                Buy with Confidence
              </h2>
              <p className="mt-4 text-sm leading-7 text-deep-navy/65">
                AgroConnect builds trust through transparency — verified farmer identities, structured transactions and a full history of every deal.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: "✅", title: "Verified Farmers", desc: "Farmers complete identity and profile verification before appearing in marketplace search." },
                { icon: "🔒", title: "Inventory Protection", desc: "Reserved stock cannot be sold to another buyer. Atomic transactions prevent overselling." },
                { icon: "📜", title: "Full Transaction History", desc: "Every offer, order and delivery status change is recorded and accessible to both parties." },
                { icon: "⭐", title: "Post-Completion Reviews", desc: "Rate and review your transaction after delivery to help the community." },
                { icon: "📞", title: "Dispute Resolution", desc: "Report issues directly through the platform. AgroConnect admin reviews disputes." },
                { icon: "🌍", title: "Transparent Pricing", desc: "Prices, quantities and currencies are always explicit. No hidden fees." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-deep-navy/8 bg-soft-bg/60 p-5">
                  <span className="text-2xl" role="img" aria-label={item.title}>{item.icon}</span>
                  <h3 className="mt-3 font-heading text-sm font-bold text-deep-navy">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-deep-navy/60">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-agro-green py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 text-center sm:px-8 lg:px-10">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white">
              Start Sourcing from Nigerian Farms
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">
              Join AgroConnect today and connect with verified farmers across Plateau State and beyond.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register/buyer"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-bold text-agro-green shadow-lg transition-colors hover:bg-soft-bg"
              >
                Register as Buyer
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Explore Marketplace
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
