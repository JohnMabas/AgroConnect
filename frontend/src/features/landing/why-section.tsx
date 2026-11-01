const values = [
  {
    title: "Access",
    description:
      "Open up opportunities for farmers and buyers who are too often separated by distance and limited information.",
  },
  {
    title: "Trust",
    description:
      "Create a more transparent way to discover produce, suppliers and transport partners.",
  },
  {
    title: "Simplicity",
    description:
      "Make agricultural trade easier to understand and easier to coordinate for everyone involved.",
  },
  {
    title: "Opportunity",
    description:
      "Help agricultural businesses grow by connecting the right people, produce and markets.",
  },
];

export function WhySection() {
  return (
    <section id="why" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
              Why AgroConnect
            </p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
              Agricultural trade should be simpler, smarter and more accessible
            </h2>
            <p className="mt-4 text-base leading-7 text-deep-navy/65">
              Farmers deserve reliable routes to market. Buyers deserve
              dependable supply. Transporters deserve visibility. AgroConnect is
              being built to close those gaps.
            </p>

            <div className="mt-8 rounded-3xl bg-deep-navy p-6 text-white sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fresh-green">
                Starting with focus
              </p>
              <p className="mt-2 font-heading text-lg font-bold">
                Our first pilot is rooted in Plateau State, Nigeria.
              </p>
              <p className="mt-3 text-sm leading-6 text-white/65">
                We are designing around real agricultural communities first,
                with an architecture ready to grow across Nigeria and beyond.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-3xl border border-deep-navy/10 bg-white p-6"
              >
                <span
                  aria-hidden="true"
                  className="mb-5 block h-1.5 w-10 rounded-full bg-harvest-gold"
                />
                <h3 className="font-heading text-lg font-extrabold text-deep-navy">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-deep-navy/60">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
