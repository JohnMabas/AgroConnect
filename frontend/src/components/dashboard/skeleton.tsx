/**
 * Skeleton loading components for dashboard pages.
 */

interface LineSkeletonProps {
  className?: string;
  width?: string;
}

export function LineSkeleton({ className = "", width = "w-full" }: LineSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-deep-navy/10 h-4 ${width} ${className}`}
    />
  );
}

interface CardSkeletonProps {
  className?: string;
  lines?: number;
}

export function CardSkeleton({ className = "", lines = 3 }: CardSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm ${className}`}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`mb-3 h-4 rounded bg-deep-navy/10 ${i === 0 ? "w-2/3" : i % 2 === 0 ? "w-full" : "w-5/6"}`}
        />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm"
    >
      <div className="mb-2 h-3 w-20 rounded bg-deep-navy/10" />
      <div className="h-8 w-24 rounded bg-deep-navy/10" />
    </div>
  );
}
