import Link from "next/link";
import { Logo } from "@/components/logo";

const platformLinks = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Farmers", href: "/farmers" },
  { label: "Buyers", href: "/buyers" },
  { label: "Cooperatives", href: "/cooperatives" },
];

const joinLinks = [
  { label: "Register as Farmer", href: "/register/farmer" },
  { label: "Register as Buyer", href: "/register/buyer" },
  { label: "Register Cooperative", href: "/register/cooperative" },
  { label: "Register as Transporter", href: "/register/transporter" },
  { label: "Sign In", href: "/login" },
];

const supportLinks = [
  { label: "Get Started", href: "/register" },
  { label: "How It Works", href: "/how-it-works" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-deep-navy/10 bg-white">
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-deep-navy/60">
              Bringing farmers, buyers, cooperatives and transporters together
              to make agricultural trade simpler, smarter and more accessible.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-soft-bg px-3.5 py-2 text-xs font-semibold text-deep-navy/70">
              <span className="h-1.5 w-1.5 rounded-full bg-fresh-green" />
              Pilot focus: Plateau State, Nigeria
            </p>
          </div>

          {/* Platform */}
          <div>
            <h2 className="font-heading text-xs font-extrabold uppercase tracking-wider text-deep-navy">
              Platform
            </h2>
            <ul className="mt-4 space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-deep-navy/60 transition-colors hover:text-agro-green"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Join */}
          <div>
            <h2 className="font-heading text-xs font-extrabold uppercase tracking-wider text-deep-navy">
              Join AgroConnect
            </h2>
            <ul className="mt-4 space-y-3">
              {joinLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-deep-navy/60 transition-colors hover:text-agro-green"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h2 className="font-heading text-xs font-extrabold uppercase tracking-wider text-deep-navy">
              Support
            </h2>
            <ul className="mt-4 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-deep-navy/60 transition-colors hover:text-agro-green"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <h2 className="font-heading text-xs font-extrabold uppercase tracking-wider text-deep-navy">
                Our Promise
              </h2>
              <p className="mt-3 font-heading text-base font-bold text-agro-green">
                Connect people, produce, and markets.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-deep-navy/10 pt-6 text-xs text-deep-navy/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 AgroConnect. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Connecting Agriculture. Empowering Markets.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
