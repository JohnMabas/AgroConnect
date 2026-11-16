"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/session";
import type { SafeUser } from "@/lib/api";

interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  user: SafeUser;
  navLinks: NavLink[];
  onClose?: () => void;
}

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    farmer: "Farmer",
    buyer: "Buyer",
    cooperative: "Cooperative",
    transporter: "Transporter",
    admin: "Admin",
    cooperative_agent: "Agent",
  };
  return (
    <span className="rounded-full bg-agro-green/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-agro-green">
      {labels[role] ?? role}
    </span>
  );
}

function primaryRole(user: SafeUser): string {
  const order = ["admin", "cooperative_agent", "cooperative", "farmer", "transporter", "buyer"];
  return order.find((r) => user.roles.includes(r)) ?? user.roles[0] ?? "user";
}

export function Sidebar({ user, navLinks, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    setLoggingOut(true);
    await signOut();
    router.push("/login");
  }

  const displayName = user.display_name ?? user.email ?? user.phone_number ?? "User";

  return (
    <aside
      className={`flex h-full flex-col bg-white border-r border-deep-navy/10 transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo + collapse */}
      <div className="flex h-16 items-center justify-between gap-2 border-b border-deep-navy/10 px-4">
        {!collapsed && (
          <Link href="/" aria-label="AgroConnect home" onClick={onClose}>
            <Logo />
          </Link>
        )}
        {collapsed && (
          <Link href="/" aria-label="AgroConnect home" className="mx-auto" onClick={onClose}>
            <Logo showWordmark={false} />
          </Link>
        )}
        {!onClose && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0 rounded-lg p-1.5 text-deep-navy/40 transition-colors hover:bg-soft-bg hover:text-deep-navy hidden lg:block"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              {collapsed ? (
                <path
                  fillRule="evenodd"
                  d="M12.293 4.293a1 1 0 010 1.414L8.414 9.5H15a1 1 0 110 2H8.414l3.879 3.793a1 1 0 01-1.414 1.414l-5.5-5.5a1 1 0 010-1.414l5.5-5.5a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M7.707 4.293a1 1 0 010 1.414L3.828 9.5H10a1 1 0 110 2H3.828l3.879 3.793a1 1 0 01-1.414 1.414l-5.5-5.5a1 1 0 010-1.414l5.5-5.5a1 1 0 011.414 0zM13 5a1 1 0 011 1v8a1 1 0 11-2 0V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="border-b border-deep-navy/10 px-4 py-4">
          <p className="truncate text-sm font-semibold text-deep-navy" title={displayName}>
            {displayName}
          </p>
          <div className="mt-1.5">
            <RoleBadge role={primaryRole(user)} />
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav aria-label="Dashboard navigation" className="flex-1 overflow-y-auto py-3 px-2">
        {navLinks.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-agro-green/10 text-agro-green"
                  : "text-deep-navy/70 hover:bg-soft-bg hover:text-deep-navy"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {icon && (
                <span className="shrink-0" aria-hidden="true">{icon}</span>
              )}
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-deep-navy/10 p-3">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loggingOut}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-navy/60 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60`}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l3 3m0 0l-3 3m3-3H8m5 6H5a1 1 0 01-1-1V5a1 1 0 011-1h8" />
          </svg>
          {!collapsed && (loggingOut ? "Signing out…" : "Sign out")}
        </button>
      </div>
    </aside>
  );
}
