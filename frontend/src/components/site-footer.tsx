import { Logo } from "@/components/logo";

const footerLinks = [
  { label: "Why AgroConnect", href: "#why" },
  { label: "Who it's for", href: "#audience" },
  { label: "How it works", href: "#how-it-works" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-deep-navy/10 bg-white">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-6 text-deep-navy/60">
              Bringing farmers, buyers and transporters together to make
              agricultural trade simpler, smarter and more accessible.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-soft-bg px-3.5 py-2 text-xs font-semibold text-deep-navy/70">
              <span className="h-1.5 w-1.5 rounded-full bg-fresh-green" />
              Pilot focus: Plateau State, Nigeria
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="font-heading text-sm font-extrabold uppercase tracking-wider text-deep-navy">
              Explore
            </h2>
            <ul className="mt-4 space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm font-medium text-deep-navy/60 transition-colors hover:text-agro-green"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="max-w-xs">
            <h2 className="font-heading text-sm font-extrabold uppercase tracking-wider text-deep-navy">
              Our promise
            </h2>
            <p className="mt-4 font-heading text-lg font-bold leading-7 text-agro-green">
              Connect people, produce, and markets.
            </p>
            <p className="mt-2 text-sm leading-6 text-deep-navy/60">
              Built for trust, access, transparency and long-term agricultural
              growth.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-deep-navy/10 pt-6 text-xs text-deep-navy/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; AgroConnect. All rights reserved.</p>
          <p>Connecting Agriculture. Empowering Markets.</p>
        </div>
      </div>
    </footer>
  );
}
