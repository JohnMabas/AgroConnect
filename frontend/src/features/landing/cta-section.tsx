export function CtaSection() {
  return (
    <section id="join" className="scroll-mt-24 px-5 pb-20 pt-4 sm:px-8 sm:pb-24 lg:px-10">
      <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] bg-agro-green px-6 py-14 text-center sm:px-10 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-fresh-green/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-harvest-gold/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fresh-green">
            The future of agricultural trade
          </p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Let&apos;s connect agriculture and empower markets together.
          </h2>
          <p className="mt-4 text-base leading-7 text-white/75">
            AgroConnect is being built step by step with farmers, buyers and
            transporters at the centre. Marketplace onboarding will open in a
            future phase.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#audience"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-agro-green transition-colors hover:bg-soft-bg"
            >
              Explore who it&apos;s for
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
