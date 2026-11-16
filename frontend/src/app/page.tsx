import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HeroSlideshow, type Slide } from "@/components/hero-slideshow";
import { AnimatedSection } from "@/components/animated-section";

export const metadata: Metadata = {
  title: "AgroConnect | Connecting Agriculture. Empowering Markets.",
  description:
    "AgroConnect connects farmers, buyers, cooperatives and transporters through a trusted agricultural marketplace.",
  openGraph: {
    title: "AgroConnect | Connecting Agriculture. Empowering Markets.",
    description:
      "AgroConnect connects farmers, buyers, cooperatives and transporters through a trusted agricultural marketplace.",
  },
};

// ─── Slideshow — agricultural photography across the platform ──────────────
const SLIDES: Slide[] = [
  {
    id: "s1",
    src: "https://i.pinimg.com/736x/11/ba/f6/11baf6c33a7078af8800a7a545bc218f.jpg",
    alt: "Farmer working in an agricultural field",
  },
  {
    id: "s2",
    // Slide 2 — BUYERS: Buyers and traders at a fresh produce market
    // Confirmed CDN 200 OK: photo-1488459716781-31db52582fe9
    src: "https://images.unsplash.com/photo-1488459716781-31db52582fe9",
    alt: "Buyers and traders inspecting fresh agricultural produce at a market",
  },
  {
    id: "s4",
    // Slide 3 — TRANSPORTERS: Truck transporting agricultural produce
    // Confirmed CDN 200 OK: photo-1601584115197-04ecc0da31d7
    src: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7",
    alt: "Agricultural produce being transported by truck from farm to market",
  },
];

// ─── Produce categories ───────────────────────────────────────────────────────
const categories = [
  { name: "Maize",    icon: "🌽", desc: "Yellow, white and sweet corn",   color: "bg-harvest-gold/15", iconBg: "bg-harvest-gold" },
  { name: "Rice",     icon: "🌾", desc: "Local and imported varieties",    color: "bg-fresh-green/15",  iconBg: "bg-fresh-green"  },
  { name: "Tomatoes", icon: "🍅", desc: "Fresh and processing tomatoes",   color: "bg-red-50",          iconBg: "bg-red-500"      },
  { name: "Potatoes", icon: "🥔", desc: "Irish and sweet varieties",       color: "bg-amber-50",        iconBg: "bg-amber-600"    },
  { name: "Beans",    icon: "🫘", desc: "Cowpeas, soya beans and legumes", color: "bg-agro-green/8",    iconBg: "bg-agro-green"   },
];

// ─── Who we serve ─────────────────────────────────────────────────────────────
const audience = [
  {
    role: "Farmers",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21V9M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 10c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6z" />
      </svg>
    ),
    desc: "List produce, manage inventory, connect with buyers and track your earnings — all in one place.",
    cta: "Join as Farmer", href: "/register/farmer",
    color: "bg-agro-green/10 text-agro-green",
  },
  {
    role: "Buyers",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    desc: "Discover verified produce, compare suppliers, submit offers and coordinate delivery with ease.",
    cta: "Join as Buyer", href: "/register/buyer",
    color: "bg-harvest-gold/15 text-amber-700",
  },
  {
    role: "Cooperatives",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    desc: "Register your cooperative, manage members, assign agents and strengthen your agricultural supply chain.",
    cta: "Register Cooperative", href: "/register/cooperative",
    color: "bg-deep-navy/8 text-deep-navy",
  },
  {
    role: "Transporters",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    desc: "Offer transport services, receive delivery requests and grow your agricultural logistics business.",
    cta: "Join as Transporter", href: "/register/transporter",
    color: "bg-fresh-green/15 text-agro-green",
  },
];

// ─── Steps ───────────────────────────────────────────────────────────────────
const steps = [
  { num: "01", title: "Join AgroConnect",      desc: "Register as a farmer, buyer, cooperative or transporter in minutes." },
  { num: "02", title: "List or Discover",      desc: "Farmers publish available produce. Buyers discover listings and submit buyer requests." },
  { num: "03", title: "Connect and Negotiate", desc: "Chat directly, submit structured offers and agree on the right price." },
  { num: "04", title: "Complete Orders",       desc: "Finalise payment and coordinate delivery through trusted transporters." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">

        {/* ─── Hero Slideshow ───────────────────────────────────────────── */}
        <HeroSlideshow slides={SLIDES} />

        {/* ─── Platform Introduction ────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <AnimatedSection>
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">What is AgroConnect?</p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                  The Agricultural Marketplace Built for Africa
                </h2>
                <p className="mt-5 text-base leading-8 text-deep-navy/65">
                  AgroConnect connects farmers who have produce with buyers who need it — removing middlemen, eliminating wasted harvests and creating better prices for everyone in the agricultural chain.
                </p>
              </div>
            </AnimatedSection>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Transparent Listings",   desc: "Every listing shows the exact quantity, unit, location and price. No hidden costs.", icon: "📋" },
                { title: "Direct Communication",   desc: "Farmers and buyers talk directly through the platform. No brokers required.",        icon: "💬" },
                { title: "Structured Negotiations",desc: "Submit and respond to formal offers. Build a clear negotiation history.",            icon: "🤝" },
                { title: "Inventory Protection",   desc: "Reserved stock is locked. Overselling is prevented at the database level.",         icon: "🔒" },
                { title: "Cooperative Support",    desc: "Registered cooperatives coordinate members, aggregate supply and assign agents.",    icon: "🏘️" },
                { title: "Accessible by Design",   desc: "Built for farmers with limited internet access, with USSD and voice support planned.",icon: "📱" },
              ].map((item, i) => (
                <AnimatedSection key={item.title} delay={i * 70}>
                  <div className="rounded-2xl border border-deep-navy/8 bg-soft-bg/60 p-6 h-full">
                    <span className="text-3xl" role="img" aria-label={item.title}>{item.icon}</span>
                    <h3 className="mt-4 font-heading text-base font-bold text-deep-navy">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-deep-navy/60">{item.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Who We Serve ─────────────────────────────────────────────── */}
        <section id="who-we-serve" className="bg-soft-bg py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <AnimatedSection>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Who We Serve</p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                  Built for Everyone in the Agricultural Chain
                </h2>
              </div>
            </AnimatedSection>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {audience.map((item, i) => (
                <AnimatedSection key={item.role} delay={i * 80}>
                  <div className="flex flex-col rounded-3xl border border-deep-navy/8 bg-white p-6 shadow-sm shadow-deep-navy/5 h-full">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color}`}>{item.icon}</div>
                    <h3 className="mt-5 font-heading text-lg font-extrabold text-deep-navy">{item.role}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-deep-navy/60">{item.desc}</p>
                    <Link href={item.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-agro-green transition-colors hover:text-deep-navy">
                      {item.cta}
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─────────────────────────────────────────────── */}
        <section id="how-it-works" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <AnimatedSection>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">How It Works</p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                  From Registration to Completed Trade
                </h2>
              </div>
            </AnimatedSection>
            <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.num}>
                  <AnimatedSection delay={i * 80}>
                    <div className="relative h-full rounded-3xl border border-deep-navy/10 bg-soft-bg/60 p-7">
                      {i < steps.length - 1 && (
                        <span aria-hidden="true" className="absolute left-full top-10 hidden h-px w-6 -translate-x-3 bg-deep-navy/15 lg:block" />
                      )}
                      <span className="font-heading text-3xl font-black text-agro-green/25">{step.num}</span>
                      <h3 className="mt-3 font-heading text-base font-bold text-deep-navy">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-deep-navy/60">{step.desc}</p>
                    </div>
                  </AnimatedSection>
                </li>
              ))}
            </ol>
            <AnimatedSection className="mt-10 text-center" delay={320}>
              <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-agro-green transition-colors hover:text-deep-navy">
                See the full process
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── Marketplace Preview ──────────────────────────────────────── */}
        <section className="bg-soft-bg py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <AnimatedSection>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Marketplace</p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                  Fresh Produce from Nigerian Farms
                </h2>
                <p className="mt-4 text-base leading-7 text-deep-navy/60">
                  Explore produce categories available on AgroConnect. Create an account to browse live listings.
                </p>
              </div>
            </AnimatedSection>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {categories.map((cat, i) => (
                <AnimatedSection key={cat.name} delay={i * 60}>
                  <Link href="/marketplace" className={`flex flex-col items-center rounded-2xl border border-deep-navy/8 p-6 text-center transition-shadow hover:shadow-md hover:shadow-deep-navy/8 ${cat.color}`}>
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${cat.iconBg}`} role="img" aria-label={cat.name}>
                      {cat.icon}
                    </span>
                    <h3 className="mt-3 font-heading text-sm font-bold text-deep-navy">{cat.name}</h3>
                    <p className="mt-1 text-xs text-deep-navy/55">{cat.desc}</p>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
            <AnimatedSection className="mt-10 text-center" delay={300}>
              <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy">
                Browse Marketplace
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── Cooperative Section ──────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
              <AnimatedSection>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Cooperatives</p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                  Empowering Agricultural Cooperatives.
                </h2>
                <p className="mt-5 text-base leading-8 text-deep-navy/65">
                  AgroConnect provides a dedicated registration and management system for agricultural cooperatives. Register, get verified and begin coordinating your members.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Register your cooperative for official approval.",
                    "Manage member farmers and their profiles.",
                    "Assign authorized agents to assist farmers.",
                    "Coordinate produce listings and aggregate supply.",
                    "Track member activity and ensure accountability.",
                    "Farmers retain full ownership — agents only assist.",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-sm text-deep-navy/70">{point}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register/cooperative" className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy">
                  Register Your Cooperative
                </Link>
              </AnimatedSection>
              <AnimatedSection delay={120}>
                <div className="relative overflow-hidden rounded-3xl">
                  {/* Annie Spratt — women farming cassava together, Sierra Leone */}
                  <Image
                    src="https://images.unsplash.com/photo-1593113630400-ea4288922497?w=800&q=80"
                    alt="Black African women working together as an agricultural cooperative, farming cassava in West Africa"
                    width={800}
                    height={500}
                    className="h-80 w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-agro-green/10 to-transparent" aria-hidden="true" />
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ─── Farmer Protection ────────────────────────────────────────── */}
        <section className="bg-soft-bg py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
              <AnimatedSection delay={120} className="order-2 lg:order-1">
                <div className="relative overflow-hidden rounded-3xl">
                  <Image
                    src="https://i.pinimg.com/736x/06/e7/65/06e765a03d33b72411eee6c18564e224.jpg"
                    alt="Farmer working in a field — representing farmer ownership and control"
                    width={800}
                    height={500}
                    className="h-80 w-full object-cover object-center"
                  />
                </div>
              </AnimatedSection>
              <AnimatedSection className="order-1 lg:order-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Farmer Protection</p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                  Your Farm. Your Data. Your Control.
                </h2>
                <p className="mt-5 text-base leading-8 text-deep-navy/65">
                  AgroConnect is built on the principle that farmers retain full ownership of their accounts and produce. Cooperative agents work in support — never in control.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Farmers retain ownership of their profiles and harvest records.",
                    "Agents operate only through approved cooperatives.",
                    "Farmers explicitly grant and can revoke agent access.",
                    "Sensitive actions require farmer approval.",
                    "All agent activity is logged and auditable.",
                    "Farmers can report any misconduct through the platform.",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span className="text-sm text-deep-navy/70">{point}</span>
                    </li>
                  ))}
                </ul>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ─── Rural Accessibility ──────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <AnimatedSection>
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Accessibility</p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
                  Designed to Reach Every Farmer
                </h2>
                <p className="mt-5 text-base leading-8 text-deep-navy/65">
                  We know that not every farmer has a smartphone or reliable internet access. AgroConnect is building toward a future where every farmer can participate.
                </p>
              </div>
            </AnimatedSection>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Simple Interfaces",     desc: "Clean, low-friction forms optimised for all screen sizes and slow connections.", icon: "📱", status: "Available"      },
                { title: "USSD Access",            desc: "Farmers without smartphones can access core features via USSD short codes.",    icon: "📟", status: "In development" },
                { title: "Voice & IVR",            desc: "Voice-based workflows for farmers who prefer spoken interaction.",              icon: "📞", status: "Planned"         },
                { title: "Local Language Support", desc: "Platform translations starting with Hausa, Yoruba and Igbo.",                  icon: "🌍", status: "Planned"         },
              ].map((item, i) => (
                <AnimatedSection key={item.title} delay={i * 70}>
                  <div className="rounded-2xl border border-deep-navy/8 bg-soft-bg/60 p-6 h-full">
                    <span className="text-3xl" role="img" aria-label={item.title}>{item.icon}</span>
                    <h3 className="mt-3 font-heading text-sm font-bold text-deep-navy">{item.title}</h3>
                    <p className="mt-2 text-xs text-deep-navy/55">{item.desc}</p>
                    <span className={`mt-4 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      item.status === "Available" ? "bg-fresh-green/15 text-agro-green"
                        : item.status === "In development" ? "bg-harvest-gold/15 text-amber-700"
                        : "bg-deep-navy/8 text-deep-navy/55"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Final CTA ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-agro-green py-20 sm:py-24">
          <div className="absolute inset-0" aria-hidden="true">
            {/* Ali Mkumbwa — woman harvesting grain — Tanzania */}
            <Image
              src="https://images.unsplash.com/photo-1543364195-bfe6e4932397?w=1200&q=55"
              alt=""
              fill
              className="object-cover object-center opacity-15"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-agro-green/85" />
          </div>
          <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 text-center">
            <AnimatedSection>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Be Part of a More Connected Agricultural Market.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-white/80">
                Whether you grow produce, buy produce, coordinate members or move goods — AgroConnect has a place for you.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/register" className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-agro-green shadow-lg transition-colors hover:bg-soft-bg">
                  Get Started
                </Link>
                <Link href="/marketplace" className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10">
                  Explore Marketplace
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
