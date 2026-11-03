import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-soft-bg">
      {/* Skip to content */}
      <a href="#auth-main" className="skip-link">
        Skip to main content
      </a>

      {/* Minimal header */}
      <header className="border-b border-deep-navy/10 bg-soft-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:px-8">
          <Link href="/" aria-label="AgroConnect home">
            <Logo />
          </Link>
        </div>
      </header>

      <main
        id="auth-main"
        className="flex flex-1 items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-deep-navy/10 py-6 text-center text-sm text-deep-navy/50">
        &copy; 2026 AgroConnect. All rights reserved.
      </footer>
    </div>
  );
}
