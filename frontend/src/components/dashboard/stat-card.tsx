import { StatCardSkeleton } from "./skeleton";

interface StatCardProps {
  label: string;
  value: string | number | null;
  icon?: React.ReactNode;
  accentColor?: string;
}

/**
 * Metric card. When value is null, renders a skeleton loader.
 * Never renders fake numbers — callers must pass real values or null.
 */
export function StatCard({ label, value, icon, accentColor = "text-agro-green" }: StatCardProps) {
  if (value === null) {
    return <StatCardSkeleton />;
  }

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
          {label}
        </p>
        {icon && (
          <span className={`shrink-0 ${accentColor}`} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-2 font-heading text-3xl font-extrabold ${accentColor}`}>
        {value}
      </p>
    </div>
  );
}
