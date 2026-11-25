"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { signOut } from "@/lib/session";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav, HamburgerButton } from "@/components/dashboard/mobile-nav";
import { MessagingProvider } from "@/components/messaging/messaging-provider";
import { CallManagerProvider } from "@/components/messaging/call-manager";
import { MessageNavIndicator } from "@/components/messaging/message-nav-indicator";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationNavIndicator } from "@/components/notifications/notification-nav-indicator";
import type { SafeUser } from "@/lib/api";

const navIcons = {
  offers: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M4 3a1 1 0 011-1h10a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V3zm3 2a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
      <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  reservations: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M6 2a1 1 0 011 1v1h6V3a1 1 0 112 0v1h1a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zM4 8v8h12V8H4z" clipRule="evenodd" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
      <path d="M7.17 17a3 3 0 005.66 0H7.17z" />
    </svg>
  ),
};

const offersLink = { href: "/offers", label: "Offers", icon: navIcons.offers };
const ordersLink = { href: "/orders", label: "Orders", icon: navIcons.orders };
const reservationsLink = { href: "/reservations", label: "Reservations", icon: navIcons.reservations };
const notificationsLink = { href: "/notifications", label: "Notifications", icon: navIcons.notifications };
const deliveriesLink = {
  href: "/deliveries",
  label: "Deliveries",
  icon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M3 4a1 1 0 00-1 1v8a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
      <path d="M4.5 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15.5 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
};

// Nav links per role — the first matching role wins.
function getNavLinks(user: SafeUser) {
  const roles = user.roles;

  if (roles.includes("admin")) {
    return [
      notificationsLink,
      { ...deliveriesLink, href: "/admin/deliveries" },
      {
        href: "/admin/cooperatives",
        label: "Cooperatives",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zm5 2a2 2 0 11-4 0 2 2 0 014 0zm-4 7a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zm10 10v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        ),
      },
      {
        href: "/admin/pilot",
        label: "Pilot",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
        ),
      },
      {
        href: "/profile",
        label: "Profile",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ),
      },
    ];
  }

  if (roles.includes("cooperative_agent")) {
    return [
      notificationsLink,
      {
        href: "/agent/dashboard",
        label: "My Assignments",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/profile",
        label: "Profile",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ),
      },
    ];
  }

  if (roles.includes("cooperative")) {
    return [
      notificationsLink,
      {
        href: "/cooperatives/dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        ),
      },
      {
        href: "/cooperatives/membership",
        label: "Members",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zm5 2a2 2 0 11-4 0 2 2 0 014 0zm-4 7a4 4 0 00-8 0v3h8v-3z" />
          </svg>
        ),
      },
      {
        href: "/profile",
        label: "Profile",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ),
      },
    ];
  }

  if (roles.includes("farmer")) {
    return [
      notificationsLink,
      { ...deliveriesLink, href: "/farmer/deliveries" },
      offersLink,
      ordersLink,
      reservationsLink,
      {
        href: "/farmer/dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        ),
      },
      {
        href: "/farmer/buyer-requests",
        label: "Buyer Demand",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/farmer/produce",
        label: "My Produce",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/farmer/listings",
        label: "My Listings",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
        ),
      },
      {
        href: "/farmer/inventory",
        label: "Inventory",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
            <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/farmer/profile",
        label: "My Farm",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/cooperatives/membership",
        label: "Cooperatives",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zm5 2a2 2 0 11-4 0 2 2 0 014 0zm-4 7a4 4 0 00-8 0v3h8v-3z" />
          </svg>
        ),
      },
      {
        href: "/profile",
        label: "Profile",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ),
      },
    ];
  }

  if (roles.includes("transporter")) {
    return [
      notificationsLink,
      { ...deliveriesLink, href: "/transporter/deliveries" },
      {
        href: "/transporter/dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        ),
      },
      {
        href: "/transporter/profile",
        label: "Transport Profile",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
          </svg>
        ),
      },
      {
        href: "/profile",
        label: "Profile",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ),
      },
    ];
  }

  if (roles.includes("buyer")) {
    return [
      notificationsLink,
      { ...deliveriesLink, href: "/buyer/deliveries" },
      offersLink,
      ordersLink,
      reservationsLink,
      {
        href: "/buyer/dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        ),
      },
      {
        href: "/buyer/my-requests",
        label: "My Requests",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/buyer-requests/new",
        label: "Post Request",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/marketplace",
        label: "Marketplace",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
            <path d="M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
        ),
      },
      {
        href: "/buyer/profile",
        label: "My Profile",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: "/profile",
        label: "Account",
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        ),
      },
    ];
  }

  return [
    notificationsLink,
    {
      href: "/profile",
      label: "Profile",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token, user, loading, error } = useDashboardAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState("");

  useEffect(() => {
    const message = sessionStorage.getItem("profile_setup_error");
    if (message) {
      setProfileSetupError(message); // eslint-disable-line react-hooks/set-state-in-effect
      sessionStorage.removeItem("profile_setup_error");
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg">
        <p className="text-sm text-deep-navy/60">Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg px-4">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-semibold text-agro-green hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-bg">
        <p className="text-sm text-deep-navy/60">Redirecting to sign in…</p>
      </div>
    );
  }

  const navLinks = [
    ...getNavLinks(user),
    {
      href: "/messages",
      label: "Messages",
      unreadIndicator: true,
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M3 4a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2H3zm0 2h14l-7 5-7-5z" />
        </svg>
      ),
    },
  ];
  const displayName = user.display_name ?? user.email ?? user.phone_number ?? "User";

  return (
    <MessagingProvider token={token} userId={user.id}>
      <NotificationProvider token={token} userId={user.id}>
      <CallManagerProvider token={token} userId={user.id}>
      <div className="flex min-h-screen bg-soft-bg">
        {/* Skip link */}
        <a href="#dashboard-main" className="skip-link">
          Skip to main content
        </a>

        {/* Sidebar — desktop only */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar user={user} navLinks={navLinks} />
        </div>

        {/* Mobile drawer */}
        <Suspense fallback={null}>
          <MobileNav
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            user={user}
            navLinks={navLinks}
          />
        </Suspense>

        {/* Main column */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-deep-navy/10 bg-white/95 px-4 backdrop-blur-md sm:px-6">
            <HamburgerButton onClick={() => setMobileOpen(true)} />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Messages */}
            <MessageNavIndicator />

            {/* Notifications */}
            <NotificationNavIndicator />

            {/* User display name */}
            <span className="hidden text-sm font-semibold text-deep-navy/70 sm:block">
              {displayName}
            </span>

            {/* Sign out */}
            <button
              type="button"
              onClick={async () => {
                setLoggingOut(true);
                await signOut();
                router.replace("/login");
              }}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-deep-navy/20 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-60"
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </header>

          {/* Page content */}
          <main id="dashboard-main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              {profileSetupError && (
                <div
                  role="alert"
                  className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  <p>
                    You are signed in, but your profile setup could not be
                    completed: {profileSetupError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setProfileSetupError("")}
                    className="shrink-0 font-semibold text-amber-800 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-deep-navy/10 py-4 text-center text-xs text-deep-navy/40">
            &copy; 2026 AgroConnect. All rights reserved.
          </footer>
        </div>
      </div>
      </CallManagerProvider>
      </NotificationProvider>
    </MessagingProvider>
  );
}
