"use client";

/**
 * HeroSlideshow — full-width agricultural photography slideshow.
 * - CSS crossfade transitions
 * - Auto-advance every 5.5 s, pauses on hover / focus
 * - Ken-Burns slow zoom on active slide
 * - Prev / next arrows + dot indicators
 * - Keyboard navigation (← →)
 * - ARIA live region for screen readers
 * - Full prefers-reduced-motion support
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

export interface Slide {
  id: string;
  src: string;
  alt: string;
}

interface HeroSlideshowProps {
  slides: Slide[];
  interval?: number;
}

const TRANSITION_MS = 800;

function getReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroSlideshow({ slides, interval = 5500 }: HeroSlideshowProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion] = useState<boolean>(getReducedMotion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (transitioning || index === current) return;
      setTransitioning(true);
      setCurrent(index);
      setTimeout(() => setTransitioning(false), reducedMotion ? 0 : TRANSITION_MS);
    },
    [current, transitioning, reducedMotion],
  );

  const next = useCallback(
    () => goTo((current + 1) % slides.length),
    [current, goTo, slides.length],
  );
  const prev = useCallback(
    () => goTo((current - 1 + slides.length) % slides.length),
    [current, goTo, slides.length],
  );

  useEffect(() => {
    if (reducedMotion || paused) return;
    timerRef.current = setTimeout(next, interval);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, reducedMotion, next, interval]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
  }

  return (
    <section
      className="relative h-[90vh] min-h-[560px] max-h-[860px] overflow-hidden bg-deep-navy"
      aria-label="AgroConnect hero"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Screen-reader slide announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Slide ${current + 1} of ${slides.length}`}
      </div>

      {/* ── Slide images ─────────────────────────────────────────────── */}
      {slides.map((s, i) => {
        const isCurrent = i === current;
        return (
          <div
            key={s.id}
            aria-hidden={!isCurrent}
            className={["absolute inset-0", isCurrent ? "z-10" : "z-0"].join(" ")}
            style={{
              opacity: isCurrent ? 1 : 0,
              transition: reducedMotion ? "none" : `opacity ${TRANSITION_MS}ms ease-in-out`,
              pointerEvents: isCurrent ? "auto" : "none",
            }}
          >
            <Image
              src={`${s.src}?w=1600&q=85&fit=crop&auto=format`}
              alt={s.alt}
              fill
              sizes="100vw"
              className={[
                "object-cover object-center",
                !reducedMotion && isCurrent ? "animate-ken-burns" : "",
              ].join(" ")}
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        );
      })}

      {/* ── Overlay gradient — keeps text readable over all images ───── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-20"
        style={{
          background:
            "linear-gradient(to right, rgba(24,50,75,0.78) 0%, rgba(24,50,75,0.46) 55%, rgba(24,50,75,0.18) 100%)",
        }}
      />
      {/* Bottom vignette behind dot indicators */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-20 h-28"
        style={{ background: "linear-gradient(to top, rgba(24,50,75,0.55), transparent)" }}
      />

      {/* ── Hero text ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-30 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <h1 className="font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Connecting Farmers to{" "}
              <span className="text-fresh-green">Better Market Opportunities.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
              AgroConnect brings farmers, buyers, cooperatives and transporters together in one trusted agricultural marketplace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-agro-green px-7 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-fresh-green hover:text-deep-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                Explore Marketplace
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/60 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-deep-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                Join AgroConnect
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Prev / Next arrows ────────────────────────────────────────── */}
      <div className="absolute inset-y-0 left-0 z-30 hidden items-center pl-4 sm:flex">
        <button
          type="button"
          onClick={prev}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Previous slide"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 z-30 hidden items-center pr-4 sm:flex">
        <button
          type="button"
          onClick={next}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Next slide"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ── Dot indicators ────────────────────────────────────────────── */}
      <div
        className="absolute bottom-5 left-0 right-0 z-30 flex items-center justify-center gap-2.5"
        role="tablist"
        aria-label="Slide navigation"
      >
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={[
              "h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1",
              i === current ? "w-8 bg-white" : "w-2 bg-white/45 hover:bg-white/70",
            ].join(" ")}
          />
        ))}
      </div>
    </section>
  );
}
