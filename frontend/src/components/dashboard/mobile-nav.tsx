"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import type { SafeUser } from "@/lib/api";

interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  user: SafeUser;
  navLinks: NavLink[];
}

export function MobileNav({ open, onClose, user, navLinks }: MobileNavProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-deep-navy/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="absolute inset-y-0 left-0 flex h-full w-72 max-w-[85vw]">
        <Sidebar user={user} navLinks={navLinks} onClose={onClose} />
      </div>
    </div>
  );
}

export function HamburgerButton({ onClick, label = "Open menu" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-deep-navy/70 transition-colors hover:bg-soft-bg hover:text-deep-navy lg:hidden"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}
