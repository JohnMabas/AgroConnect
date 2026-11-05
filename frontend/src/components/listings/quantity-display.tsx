interface QuantityDisplayProps {
  available: number;
  unit: string;
  reserved?: number;
  sold?: number;
  className?: string;
}

/**
 * Consistent quantity rendering across listing cards, detail pages and
 * inventory views. Reserved and sold values are shown only when supplied.
 */
export function QuantityDisplay({
  available,
  unit,
  reserved,
  sold,
  className = "",
}: QuantityDisplayProps) {
  const showBreakdown = reserved !== undefined || sold !== undefined;

  return (
    <span className={className}>
      <span className="font-semibold">
        {available} {unit}
      </span>{" "}
      available
      {showBreakdown && (
        <span className="text-deep-navy/55">
          {" "}
          · {reserved ?? 0} reserved · {sold ?? 0} sold
        </span>
      )}
    </span>
  );
}
