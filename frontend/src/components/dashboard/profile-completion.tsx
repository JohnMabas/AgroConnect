interface CompletionItem {
  label: string;
  done: boolean;
}

interface ProfileCompletionProps {
  items: CompletionItem[];
  title?: string;
}

export function ProfileCompletion({ items, title = "Profile completion" }: ProfileCompletionProps) {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-deep-navy">{title}</h2>
        <span className="text-sm font-bold text-agro-green">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-deep-navy/10">
        <div
          className="h-full rounded-full bg-agro-green transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% profile complete`}
        />
      </div>

      {/* Items */}
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs">
            {item.done ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-agro-green/15" aria-label="done">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-agro-green"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              </span>
            ) : (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-deep-navy/8" aria-label="incomplete">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-deep-navy/30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="3" x2="9" y2="9" />
                  <line x1="9" y1="3" x2="3" y2="9" />
                </svg>
              </span>
            )}
            <span className={item.done ? "text-deep-navy/80" : "text-deep-navy/40"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
