/**
 * AgroConnect Design System — Shared UI Components
 *
 * Colors:   Agro Green #176B45 | Fresh Green #8BC34A | Harvest Gold #E9A23B
 *           Deep Navy #18324B  | Soft Background #F5F7F2 | White #FFFFFF
 * Headings: Manrope (--font-heading)
 * Body:     Inter  (--font-sans)
 */

import React from "react";

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-agro-green text-white shadow-sm hover:bg-deep-navy focus-visible:ring-agro-green/40",
  secondary:
    "bg-deep-navy text-white shadow-sm hover:bg-agro-green focus-visible:ring-deep-navy/40",
  outline:
    "border border-deep-navy/20 bg-white text-deep-navy hover:border-agro-green/40 hover:text-agro-green focus-visible:ring-agro-green/30",
  ghost:
    "text-deep-navy/70 hover:bg-soft-bg hover:text-agro-green focus-visible:ring-agro-green/30",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/40",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs rounded-full",
  md: "h-11 px-5 text-sm rounded-full",
  lg: "h-13 px-6 text-base rounded-full",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-55",
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <SpinnerIcon className="h-4 w-4 animate-spin" />
      ) : leftIcon ? (
        <span aria-hidden="true">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon ? (
        <span aria-hidden="true">{rightIcon}</span>
      ) : null}
    </button>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-deep-navy"
        >
          {label}
          {!props.required && (
            <span className="ml-1 font-normal text-deep-navy/45">
              (optional)
            </span>
          )}
        </label>
      )}
      <div className="relative flex items-center">
        {leftElement && (
          <div className="pointer-events-none absolute left-3.5 text-deep-navy/45">
            {leftElement}
          </div>
        )}
        <input
          id={inputId}
          {...props}
          className={[
            "w-full rounded-xl border px-4 py-3 text-sm text-deep-navy",
            "placeholder:text-deep-navy/35 outline-none transition-colors",
            "focus:ring-2 focus:ring-agro-green/30",
            error
              ? "border-red-400 bg-red-50 focus:border-red-400"
              : "border-deep-navy/20 bg-white focus:border-agro-green",
            leftElement ? "pl-10" : "",
            rightElement ? "pr-10" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {rightElement && (
          <div className="absolute right-3.5 text-deep-navy/45">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-deep-navy/50">{hint}</p>
      )}
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  id,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-semibold text-deep-navy"
        >
          {label}
          {!props.required && (
            <span className="ml-1 font-normal text-deep-navy/45">
              (optional)
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          {...props}
          className={[
            "w-full appearance-none rounded-xl border px-4 py-3 pr-10",
            "text-sm text-deep-navy outline-none transition-colors",
            "focus:ring-2 focus:ring-agro-green/30",
            error
              ? "border-red-400 bg-red-50 focus:border-red-400"
              : "border-deep-navy/20 bg-white focus:border-agro-green",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-navy/40" />
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-deep-navy/50">{hint}</p>
      )}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const areaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={areaId}
          className="text-sm font-semibold text-deep-navy"
        >
          {label}
          {!props.required && (
            <span className="ml-1 font-normal text-deep-navy/45">
              (optional)
            </span>
          )}
        </label>
      )}
      <textarea
        id={areaId}
        {...props}
        className={[
          "w-full rounded-xl border px-4 py-3 text-sm text-deep-navy",
          "placeholder:text-deep-navy/35 outline-none transition-colors resize-y min-h-[100px]",
          "focus:ring-2 focus:ring-agro-green/30",
          error
            ? "border-red-400 bg-red-50 focus:border-red-400"
            : "border-deep-navy/20 bg-white focus:border-agro-green",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-deep-navy/50">{hint}</p>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  hover?: boolean;
}

const cardPadding: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className = "", padding = "md", hover = false }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-deep-navy/8 bg-white shadow-sm shadow-deep-navy/5",
        hover ? "transition-shadow hover:shadow-md hover:shadow-deep-navy/10 cursor-pointer" : "",
        cardPadding[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "green" | "gold" | "navy" | "gray" | "red" | "outline-green";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  green: "bg-fresh-green/15 text-agro-green",
  gold: "bg-harvest-gold/15 text-amber-700",
  navy: "bg-deep-navy/10 text-deep-navy",
  gray: "bg-deep-navy/8 text-deep-navy/60",
  red: "bg-red-50 text-red-600",
  "outline-green": "border border-agro-green/30 text-agro-green bg-transparent",
};

export function Badge({
  children,
  variant = "green",
  size = "md",
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        badgeVariants[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current opacity-75"
        />
      )}
      {children}
    </span>
  );
}

// ─── Alert / Banner ───────────────────────────────────────────────────────────

type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  role?: string;
}

const alertVariants: Record<AlertVariant, string> = {
  success: "bg-green-50 border-green-200 text-green-700",
  error: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
  role = "alert",
}: AlertProps) {
  return (
    <div
      role={role}
      className={[
        "rounded-xl border px-4 py-3 text-sm",
        alertVariants[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const spinnerSizes: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <SpinnerIcon
      className={[spinnerSizes[size], "animate-spin text-agro-green", className]
        .filter(Boolean)
        .join(" ")}
      aria-label="Loading…"
    />
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={["flex flex-col items-center justify-center gap-4 py-16 text-center", className].join(" ")}>
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-soft-bg text-deep-navy/30">
          {icon}
        </div>
      )}
      <div>
        <p className="font-heading text-base font-bold text-deep-navy">{title}</p>
        {description && (
          <p className="mt-1.5 text-sm text-deep-navy/55">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  align = "left",
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={[
        "flex flex-col gap-2",
        align === "center" ? "items-center text-center" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          {eyebrow}
        </p>
      )}
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-deep-navy sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-2xl text-base leading-7 text-deep-navy/60">
          {description}
        </p>
      )}
      {actions && <div className="mt-2">{actions}</div>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={[
        "flex flex-col gap-2",
        align === "center" ? "mx-auto max-w-2xl text-center" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          {eyebrow}
        </p>
      )}
      <h2 className="font-heading text-2xl font-extrabold tracking-tight text-deep-navy sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-base leading-7 text-deep-navy/60">{description}</p>
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={["border-t border-deep-navy/10", className].join(" ")} />;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={["flex items-center justify-center gap-2", className].join(" ")}
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-deep-navy/15 text-sm text-deep-navy/70 transition-colors hover:border-agro-green/40 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>

      <span className="text-sm text-deep-navy/60">
        Page{" "}
        <span className="font-semibold text-deep-navy">{page}</span> of{" "}
        <span className="font-semibold text-deep-navy">{totalPages}</span>
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-deep-navy/15 text-sm text-deep-navy/70 transition-colors hover:border-agro-green/40 hover:text-agro-green disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export function Checkbox({ label, error, id, className = "", ...props }: CheckboxProps) {
  const checkId = id ?? "checkbox";
  return (
    <div className={["flex flex-col gap-1", className].join(" ")}>
      <label htmlFor={checkId} className="flex cursor-pointer items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-deep-navy/25 bg-white transition-colors has-[:checked]:border-agro-green has-[:checked]:bg-agro-green">
          <input
            type="checkbox"
            id={checkId}
            {...props}
            className="peer sr-only"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="hidden h-3 w-3 text-white peer-checked:block"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        </div>
        <span className="text-sm leading-6 text-deep-navy/80">{label}</span>
      </label>
      {error && (
        <p role="alert" className="ml-8 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-lg bg-deep-navy/8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}

// ─── Internal Icon Helpers ────────────────────────────────────────────────────

function SpinnerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
