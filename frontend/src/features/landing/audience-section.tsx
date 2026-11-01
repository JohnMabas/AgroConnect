import type { Audience } from "@/types";

const audiences: Audience[] = [
  {
    name: "Farmers",
    description:
      "Showcase what you grow and connect with buyers who value your produce, beyond the nearest market.",
    icon: "farmer",
    highlights: ["Greater market reach", "Clear produce listings"],
  },
  {
    name: "Buyers",
    description:
      "Discover reliable suppliers, compare available produce and source with confidence from the farm gate.",
    icon: "buyer",
    highlights: ["Reliable sourcing", "Transparent supply"],
  },
  {
    name: "Transporters",
    description:
      "Find delivery opportunities that keep agricultural goods moving from farm to market efficiently.",
    icon: "transporter",
    highlights: ["New delivery routes", "Better coordination"],
  },
];

function AudienceIcon({ icon }: { icon: Audience["icon"] }) {
  const paths = {
    farmer: (
      <>
        <path d="M12 21V10" />
        <path d="M12 14c-3.3 0-6-2.7-6-6 3.3 0 6 2.7 6 6Z" />
        <path d="M12 11c3.3 0 6-2.7 6-6-3.3 0-6 2.7-6 6Z" />
      </>
    ),
    buyer: (
      <>
        <path d="M6 7h12l1.5 13h-15L6 7Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    transporter: (
      <>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="17.5" cy="18" r="1.5" />
      </>
    ),
  } as const;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[icon]}
    </svg>
  );
}

export function AudienceSection() {
  return (
    <section id="audience" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
            Who it&apos;s for
          </p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
            One connected network for the whole value chain
          </h2>
          <p className="mt-4 text-base leading-7 text-deep-navy/65">
            AgroConnect brings the people behind agricultural trade closer
            together, so produce moves from farm to market with fewer barriers.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {audiences.map((audience, index) => (
            <article
              key={audience.name}
              className="group relative flex flex-col rounded-3xl border border-deep-navy/10 bg-soft-bg/60 p-6 transition-colors hover:border-agro-green/30 hover:bg-soft-bg sm:p-7"
            >
              <span
                aria-hidden="true"
                className="absolute right-6 top-6 font-heading text-sm font-extrabold text-deep-navy/15"
              >
                0{index + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-agro-green text-white">
                <AudienceIcon icon={audience.icon} />
              </span>
              <h3 className="mt-5 font-heading text-xl font-extrabold text-deep-navy">
                {audience.name}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-deep-navy/65">
                {audience.description}
              </p>
              <ul className="mt-6 space-y-2.5 border-t border-deep-navy/10 pt-5">
                {audience.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-center gap-2.5 text-sm font-semibold text-deep-navy/80"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-agro-green"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                    {highlight}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
