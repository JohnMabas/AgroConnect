"use client";

/**
 * AnimatedSection
 *
 * Scroll-triggered fade-up reveal using IntersectionObserver.
 *
 * Uses useSyncExternalStore to safely detect client-side mount without
 * triggering setState-in-effect or SSR hydration mismatches.
 *
 * prefers-reduced-motion: content is immediately visible, no animation.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// useSyncExternalStore-based "is client" hook — no setState in effect needed
// subscribe is required by useSyncExternalStore; no external store to listen to.
const subscribe = (() => () => {}) as Parameters<typeof useSyncExternalStore>[0];
function getClientSnapshot() { return true; }
function getServerSnapshot() { return false; }
function useIsClient() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  /** Transition delay in ms. Default 0. */
  delay?: number;
  /** IntersectionObserver threshold. Default 0.08. */
  threshold?: number;
}

export function AnimatedSection({
  children,
  className = "",
  delay = 0,
  threshold = 0.08,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const [prefersReduced] = useState<boolean>(getReducedMotion);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!isClient || prefersReduced) return;
    const el = ref.current;
    if (!el) return;

    // If already in the viewport, trigger quickly
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const t = setTimeout(() => setInView(true), 80);
      return () => clearTimeout(t);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -30px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isClient, threshold, prefersReduced]);

  // Before client hydration, or when reduced motion: render without animation classes
  if (!isClient || prefersReduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={[
        "transition-all duration-700 ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
