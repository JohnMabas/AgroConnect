const produce = [
  { name: "Maize", detail: "2.5 tonnes · Plateau", color: "bg-harvest-gold" },
  { name: "Tomatoes", detail: "800 kg · Jos North", color: "bg-fresh-green" },
  { name: "Irish Potatoes", detail: "1.2 tonnes · Bokkos", color: "bg-agro-green" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-fresh-green/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-40 h-[24rem] w-[24rem] rounded-full bg-harvest-gold/10 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-agro-green/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-agro-green">
            <span className="h-2 w-2 rounded-full bg-fresh-green" />
            Agriculture, connected
          </p>

          <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-deep-navy sm:text-5xl lg:text-6xl">
            Connecting Agriculture.
            <span className="mt-2 block text-agro-green">
              Empowering Markets.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-deep-navy/70 sm:text-lg sm:leading-8">
            Bringing farmers, buyers and transporters together to make
            agricultural trade simpler, smarter and more accessible.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#audience"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-agro-green/20 transition-colors hover:bg-deep-navy"
            >
              Explore the platform
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-deep-navy/15 bg-white px-6 py-3.5 text-sm font-bold text-deep-navy transition-colors hover:border-agro-green/40 hover:text-agro-green"
            >
              See how it works
            </a>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-deep-navy/10 pt-7">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                Farmers
              </dt>
              <dd className="mt-1 font-heading text-sm font-bold text-deep-navy">
                More reach
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                Buyers
              </dt>
              <dd className="mt-1 font-heading text-sm font-bold text-deep-navy">
                Better access
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                Transporters
              </dt>
              <dd className="mt-1 font-heading text-sm font-bold text-deep-navy">
                Real opportunity
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -left-4 top-16 hidden rounded-2xl border border-deep-navy/10 bg-white px-4 py-3 shadow-xl shadow-deep-navy/5 sm:block">
            <p className="text-xs font-semibold text-deep-navy/50">Pilot focus</p>
            <p className="mt-0.5 text-sm font-bold text-deep-navy">
              Plateau State, Nigeria
            </p>
          </div>

          <div className="relative rounded-[2rem] border border-deep-navy/10 bg-white p-5 shadow-2xl shadow-deep-navy/10 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/45">
                  AgroConnect network
                </p>
                <p className="mt-1 font-heading text-lg font-extrabold text-deep-navy">
                  Fresh from the farm
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-fresh-green/15 px-3 py-1.5 text-xs font-bold text-agro-green">
                <span className="h-1.5 w-1.5 rounded-full bg-agro-green" />
                Preview
              </span>
            </div>

            <ul className="mt-6 space-y-3">
              {produce.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center gap-4 rounded-2xl border border-deep-navy/8 bg-soft-bg/70 p-4"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 21V9" />
                      <path d="M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6Z" />
                      <path d="M12 10c3.5 0 6-2.5 6-6-3.5 0-6 2.5-6 6Z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-bold text-deep-navy">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-deep-navy/55">
                      {item.detail}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-agro-green shadow-sm">
                    Available
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-deep-navy p-4">
              <div className="flex -space-x-2">
                {["F", "B", "T"].map((initial, index) => (
                  <span
                    key={initial}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-deep-navy text-xs font-bold text-deep-navy ${
                      index === 0
                        ? "bg-fresh-green"
                        : index === 1
                          ? "bg-harvest-gold"
                          : "bg-white"
                    }`}
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <p className="text-right text-xs font-medium leading-5 text-white/70">
                Farmers, buyers and transporters
                <span className="block font-bold text-white">
                  moving produce together
                </span>
              </p>
            </div>
          </div>

          <div className="absolute -bottom-5 -right-3 hidden rounded-2xl border border-deep-navy/10 bg-white px-4 py-3 shadow-xl shadow-deep-navy/5 sm:block">
            <p className="text-xs font-semibold text-deep-navy/50">Built around</p>
            <p className="mt-0.5 text-sm font-bold text-agro-green">
              Trust and access
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
