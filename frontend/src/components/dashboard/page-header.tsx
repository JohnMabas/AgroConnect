import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs text-deep-navy/50">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-agro-green hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-deep-navy/60">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
