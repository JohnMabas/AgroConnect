import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "How It Works | AgroConnect",
  description:
    "Learn how AgroConnect connects farmers and buyers — from registration through listing, negotiation, payment and delivery.",
};

const steps = [
  {
    num: "01",
    title: "Register Your Account",
    who: "Everyone",
    desc: "Create a free AgroConnect account as a Farmer, Buyer, Cooperative or Transporter. Provide your phone number and/or email address. We verify your contact details before activating your account.",
    sub: [
      "Phone OTP verification",
      "Email verification link",
      "At least one contact method required",
      "Secure Argon2id password hashing",
    ],
    cta: { label: "Create Your Account", href: "/register" },
    image: "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=600&q=80",
    imageAlt: "Person using a smartphone to register",
  },
  {
    num: "02",
    title: "Create Your Profile",
    who: "Farmers & Buyers",
    desc: "Complete your profile with your location, preferences and role-specific information. Farmers can create a farmer profile with their farm details. Cooperatives register and await admin approval before they can operate.",
    sub: [
      "User profile: name, location, language",
      "Farmer profile: farm name, size, experience",
      "Cooperative profile: registration number, region",
      "Cooperative approval by AgroConnect admin",
    ],
    cta: null,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    imageAlt: "Farmer completing their profile on a device",
  },
  {
    num: "03",
    title: "Farmers List Their Produce",
    who: "Farmers",
    desc: "Farmers publish available produce listings with full details — quantity, unit of measurement, price, location, harvest date and quality description. Listings are reviewed and published for buyers to discover.",
    sub: [
      "Produce category and type from the catalogue",
      "Quantity, unit, price per unit and currency",
      "Collection location and harvest date",
      "Optional produce images",
      "Draft → Published → Paused → Closed lifecycle",
    ],
    cta: { label: "Register as Farmer", href: "/register/farmer" },
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80",
    imageAlt: "Farmer at their farm preparing a produce listing",
  },
  {
    num: "04",
    title: "Buyers Discover Produce",
    who: "Buyers",
    desc: "Buyers browse the marketplace using search and filters — by produce type, category, location, quantity and price range. Buyers can also post buyer requests describing what they need and when they need it.",
    sub: [
      "Search by name, category, location",
      "Filter by price, quantity and produce type",
      "Create buyer requests with quantity and deadline",
      "Discover matching farmers and cooperatives",
    ],
    cta: { label: "Register as Buyer", href: "/register/buyer" },
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80",
    imageAlt: "Buyer browsing produce at a market",
  },
  {
    num: "05",
    title: "Connect and Communicate",
    who: "Farmers & Buyers",
    desc: "Once a buyer finds a suitable listing or a farmer sees a buyer request, either party can start a direct conversation through the platform. Chat securely — no phone numbers or email addresses are exchanged.",
    sub: [
      "Secure one-to-one messaging",
      "Messages linked to specific listings",
      "Conversation history preserved",
      "Unread message notifications",
    ],
    cta: null,
    image: "https://images.unsplash.com/photo-1573164574001-518958d9baa2?w=600&q=80",
    imageAlt: "Two people communicating about agricultural produce",
  },
  {
    num: "06",
    title: "Submit and Negotiate Offers",
    who: "Farmers & Buyers",
    desc: "Buyers submit structured purchase offers — specifying quantity, unit price, delivery terms and expiry. Farmers can accept, reject or counter with their own terms. The full negotiation thread is preserved for both parties.",
    sub: [
      "Structured offer with quantity, price and delivery terms",
      "Accept, reject or counter an offer",
      "Counteroffer creates a linked negotiation thread",
      "Offers expire automatically if not acted on",
    ],
    cta: null,
    image: null,
    imageAlt: null,
  },
  {
    num: "07",
    title: "Create an Order",
    who: "Buyers",
    desc: "Once an offer is accepted, the buyer creates an order from the accepted offer. The agreed quantity is atomically reserved from the farmer's available stock — preventing overselling. The order is created in a pending payment state.",
    sub: [
      "Order created from accepted offer",
      "Inventory reserved immediately (atomic transaction)",
      "Overselling prevented at database level",
      "Order number and history generated",
    ],
    cta: null,
    image: null,
    imageAlt: null,
  },
  {
    num: "08",
    title: "Make Payment",
    who: "Buyers",
    desc: "Buyers complete payment through Paystack hosted checkout. Payment is confirmed by webhook and verification. A successful payment consumes the inventory reservation and moves the order to paid status.",
    sub: [
      "Paystack hosted checkout integration",
      "Webhook-confirmed payment",
      "Inventory reservation consumed on payment",
      "Payment failed does not release stock immediately",
    ],
    cta: null,
    image: null,
    imageAlt: null,
  },
  {
    num: "09",
    title: "Arrange Delivery",
    who: "Buyers, Farmers & Transporters",
    desc: "After payment, a delivery request is created for the order. AgroConnect administrators assign an approved transporter based on location coverage. The transporter accepts the job and updates delivery status through each stage.",
    sub: [
      "Delivery request linked to paid order",
      "Transporter assigned by admin based on coverage",
      "Lifecycle: pending → assigned → accepted → picked up → in transit → delivered → completed",
      "All status changes logged in delivery history",
    ],
    cta: { label: "Register as Transporter", href: "/register/transporter" },
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80",
    imageAlt: "Agricultural produce being transported by truck",
  },
  {
    num: "10",
    title: "Complete the Transaction",
    who: "Buyers",
    desc: "Once delivery is received, the buyer confirms receipt through the platform. The order is marked completed and the transaction history is preserved for both parties. Buyers and farmers can leave reviews after completion.",
    sub: [
      "Buyer confirms delivery receipt",
      "Order moves to completed status",
      "Full transaction history preserved",
      "Post-completion reviews available",
    ],
    cta: null,
    image: null,
    imageAlt: null,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-soft-bg">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-fresh-green/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
                How It Works
              </p>
              <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-deep-navy sm:text-5xl">
                From Registration to Completed Trade
              </h1>
              <p className="mt-5 text-base leading-8 text-deep-navy/65">
                AgroConnect connects farmers with buyers through a clear, secure
                process — from registering your account to completing your first
                agricultural transaction.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy"
                >
                  Get Started
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center rounded-full border border-deep-navy/15 bg-white px-6 py-3.5 text-sm font-bold text-deep-navy transition-colors hover:border-agro-green/30 hover:text-agro-green"
                >
                  Explore Marketplace
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <ol className="space-y-16">
              {steps.map((step, i) => (
                <li key={step.num} className="relative">
                  {/* Connecting line */}
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-5 top-14 hidden h-full w-px bg-deep-navy/8 lg:block"
                    />
                  )}
                  <div
                    className={`grid gap-10 lg:items-center ${
                      step.image
                        ? i % 2 === 0
                          ? "lg:grid-cols-[1fr_400px]"
                          : "lg:grid-cols-[400px_1fr]"
                        : ""
                    }`}
                  >
                    <div className={step.image && i % 2 !== 0 ? "order-2" : ""}>
                      <div className="flex items-start gap-5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-agro-green/10 font-heading text-sm font-black text-agro-green">
                          {step.num}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-heading text-xl font-extrabold text-deep-navy sm:text-2xl">
                              {step.title}
                            </h2>
                            <span className="rounded-full bg-soft-bg px-2.5 py-1 text-xs font-semibold text-deep-navy/55">
                              {step.who}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-deep-navy/65">
                            {step.desc}
                          </p>
                          <ul className="mt-4 space-y-2">
                            {step.sub.map((s) => (
                              <li key={s} className="flex items-start gap-2.5">
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-fresh-green" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                                <span className="text-sm text-deep-navy/60">{s}</span>
                              </li>
                            ))}
                          </ul>
                          {step.cta && (
                            <Link
                              href={step.cta.href}
                              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-agro-green transition-colors hover:text-deep-navy"
                            >
                              {step.cta.label}
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M13 6l6 6-6 6" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    {step.image && (
                      <div className={`overflow-hidden rounded-2xl ${i % 2 !== 0 ? "order-1" : ""}`}>
                        <Image
                          src={step.image}
                          alt={step.imageAlt ?? ""}
                          width={400}
                          height={260}
                          className="h-52 w-full object-cover object-center opacity-85"
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-agro-green py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 text-center sm:px-8 lg:px-10">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">
              Join thousands of farmers and buyers on AgroConnect. Register today and start trading smarter.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-bold text-agro-green shadow-lg transition-colors hover:bg-soft-bg"
              >
                Create Your Account
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
