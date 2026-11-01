type LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Logo({ className = "", showWordmark = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="12" fill="#176B45" />
        <path
          d="M20 29c0-6 3.2-10.6 9-13-0.4 6.8-3.8 11.2-9 13Z"
          fill="#8BC34A"
        />
        <path
          d="M20 29c0-6-3.2-10.6-9-13 0.4 6.8 3.8 11.2 9 13Z"
          fill="#E9A23B"
        />
        <path
          d="M20 29V17"
          stroke="#F5F7F2"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark ? (
        <span className="font-heading text-xl font-extrabold tracking-tight text-deep-navy">
          Agro<span className="text-agro-green">Connect</span>
        </span>
      ) : null}
    </span>
  );
}
