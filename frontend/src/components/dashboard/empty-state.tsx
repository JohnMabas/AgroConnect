import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-deep-navy/5 text-deep-navy/30">
          {icon}
        </div>
      )}
      <h3 className="font-heading text-base font-bold text-deep-navy">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-deep-navy/60">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
