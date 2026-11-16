import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Agricultural Cooperatives | AgroConnect",
  description:
    "Register your agricultural cooperative on AgroConnect, manage members, assign agents and strengthen your supply chain.",
};

const registrationSteps = [
  {
    num: "01",
    title: "Submit Your Application",
    desc: "Complete the cooperative registration form with your cooperative details, registration number, agricultural focus, contact information and administrator details.",
  },
  {
    num: "02",
    title: "AgroConnect Reviews Your Application",
    desc: "Our team reviews your submission to verify your cooperative's details. This typically takes a few business days. You will not be automatically approved.",
  },
  {
    num: "03",
    title: "Approval and Activation",
    desc: "Once approved, your cooperative account is activated. You can then manage members, invite agents and begin coordinating agricultural supply.",
  },
  {
    num: "04",
    title: "Manage Your Cooperative",
    desc: "Add members, assign agents, track cooperative activity and support your farmers through the AgroConnect platform.",
  },
];

const agentRules = [
  "Only approved cooperatives can invite agents.",
  "Independent individuals cannot register themselves as AgroConnect agents.",
  "Agents must be invited by an approved cooperative administrator.",
  "Cooperative approval does not automatically provide access to farmer accounts.",
  "Farmers must explicitly consent before an agent can assist them.",
  "Farmers can revoke agent access at any time.",
  "All agent actions are recorded in a transparent audit log.",
  "Agents can only perform actions explicitly granted to them.",
];

export default function CooperativesPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-soft-bg">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-agro-green/8 blur-3xl" />
          <div className="relative mx-auto max-w-7xl grid gap-14 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
                Agricultural Cooperatives
              </p>
              <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-deep-navy sm:text-5xl">
                Empowering Agricultural Cooperatives.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-deep-navy/65">
                AgroConnect provides a dedicated registration and management system for agricultural cooperatives. Coordinate your members, assign agents and help farmers access better market opportunities — all in one trusted platform.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register/cooperative"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy"
                >
                  Register Your Cooperative
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-deep-navy/15 bg-white px-6 py-3.5 text-sm font-bold text-deep-navy transition-colors hover:border-agro-green/30 hover:text-agro-green"
                >
                  How It Works
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl shadow-2xl shadow-deep-navy/10">
              <Image
                src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80"
                alt="Agricultural cooperative members in a meeting"
                width={800}
                height={520}
                className="h-72 w-full object-cover object-center opacity-90"
                priority
              />
            </div>
          </div>
        </section>

        {/* What cooperatives can do */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">What You Can Do</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy">
                Coordinate Your Agricultural Community
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: "📋", title: "Cooperative Registration", desc: "Submit your cooperative's official details for review and approval by AgroConnect administrators." },
                { icon: "✅", title: "Verification & Trust", desc: "Approved cooperatives display a verified status that builds trust with farmers, buyers and agents." },
                { icon: "👥", title: "Manage Membership", desc: "Accept or reject farmer membership requests. View your full member list and their activity." },
                { icon: "🤝", title: "Assign Agents", desc: "Invite trusted agents to assist farmers who need help creating listings or communicating with buyers." },
                { icon: "📊", title: "Coordinate Supply", desc: "Support your members in aggregating produce listings and accessing larger buyer opportunities." },
                { icon: "📜", title: "Accountability & Audit", desc: "Every agent action is logged. Cooperative administrators can review activity and address issues." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-deep-navy/8 bg-soft-bg/60 p-6">
                  <span className="text-3xl" role="img" aria-label={item.title}>{item.icon}</span>
                  <h3 className="mt-4 font-heading text-sm font-bold text-deep-navy">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-deep-navy/60">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Registration process */}
        <section className="bg-soft-bg py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Registration Process</p>
              <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
                How Cooperative Registration Works
              </h2>
              <p className="mt-4 text-sm leading-7 text-deep-navy/65">
                Cooperative registration is a reviewed process — not automatic. AgroConnect verifies your cooperative before approving it.
              </p>
            </div>
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {registrationSteps.map((step) => (
                <li key={step.num} className="rounded-3xl border border-deep-navy/10 bg-white p-7">
                  <span className="font-heading text-3xl font-black text-agro-green/25">{step.num}</span>
                  <h3 className="mt-3 font-heading text-sm font-bold text-deep-navy">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-deep-navy/60">{step.desc}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <Link
                href="/register/cooperative"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-deep-navy"
              >
                Start Your Application
              </Link>
            </div>
          </div>
        </section>

        {/* Agent rules — IMPORTANT */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">Agents & Accountability</p>
                <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
                  How Agents Work on AgroConnect
                </h2>
                <p className="mt-4 text-sm leading-7 text-deep-navy/65">
                  Cooperative agents help farmers who may have limited access to smartphones or need assistance using digital platforms. However, strict rules protect farmers from unauthorized access.
                </p>
                <ul className="mt-6 space-y-3">
                  {agentRules.map((rule) => (
                    <li key={rule} className="flex items-start gap-3">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span className="text-sm text-deep-navy/70">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl bg-deep-navy p-8">
                <h3 className="font-heading text-lg font-extrabold text-white">
                  Important: Agent Eligibility
                </h3>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  Individuals cannot independently register themselves as AgroConnect cooperative agents. The process requires:
                </p>
                <ul className="mt-5 space-y-3">
                  {[
                    "Your cooperative must first be registered and approved by AgroConnect.",
                    "The cooperative administrator must invite you as an agent through the platform.",
                    "The agent role is assigned only after the invitation is accepted.",
                    "Farmers must separately consent before you can assist with their account.",
                  ].map((pt) => (
                    <li key={pt} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-fresh-green" aria-hidden="true" />
                      <span className="text-sm text-white/70">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Farmer consent */}
        <section className="bg-soft-bg py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="rounded-3xl border border-agro-green/15 bg-agro-green/5 p-8 lg:p-12">
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-4xl" role="img" aria-label="Shield">🛡️</span>
                <h2 className="mt-4 font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
                  Farmer Consent is Always Required
                </h2>
                <p className="mt-4 text-sm leading-7 text-deep-navy/65">
                  Cooperative approval and agent assignment do not automatically give anyone access to a farmer&apos;s account. Every farmer retains full ownership and control of their profile and produce records.
                </p>
              </div>
              <div className="mt-10 grid gap-5 sm:grid-cols-3">
                {[
                  { title: "Explicit consent", desc: "A farmer must explicitly grant an agent permission before any assistance can begin." },
                  { title: "Revocable at any time", desc: "Farmers can remove an agent's access from their account at any moment, without needing cooperative approval." },
                  { title: "Transparent audit", desc: "Every action an agent takes on behalf of a farmer is permanently logged and visible to the farmer." },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white p-6 shadow-sm">
                    <h3 className="font-heading text-sm font-bold text-deep-navy">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-deep-navy/60">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-agro-green py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 text-center sm:px-8 lg:px-10">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white">
              Register Your Cooperative Today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">
              Join the growing number of Nigerian agricultural cooperatives using AgroConnect to support their farmers.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register/cooperative"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-bold text-agro-green shadow-lg transition-colors hover:bg-soft-bg"
              >
                Register Your Cooperative
              </Link>
              <Link
                href="/farmers"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Information for Farmers
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
