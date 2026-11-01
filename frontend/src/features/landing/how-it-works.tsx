import type { Step } from "@/types";

const steps: Step[] = [
  {
    title: "Discover",
    description:
      "Farmers share what they have available. Buyers explore produce and suppliers in one connected space.",
  },
  {
    title: "Connect",
    description:
      "The right people find each other. Buyers, farmers and transporters coordinate around a shared opportunity.",
  },
  {
    title: "Move",
    description:
      "Produce travels from farm to market with clearer communication and stronger supply-chain coordination.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
            How it works
          </p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
            From farm to market, connected
          </h2>
          <p className="mt-4 text-base leading-7 text-deep-navy/65">
            A clear path from available produce to a completed agricultural
            trade, built around the people who make it happen.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-full top-10 hidden h-px w-6 -translate-x-3 bg-deep-navy/15 md:block"
                />
              ) : null}
              <div className="h-full rounded-3xl border border-deep-navy/10 bg-soft-bg/60 p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fresh-green/20 font-heading text-base font-extrabold text-agro-green">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-heading text-xl font-extrabold text-deep-navy">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-deep-navy/65">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
