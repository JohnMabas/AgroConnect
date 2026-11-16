"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type SafeUser } from "@/lib/api";
import { loadSession, roleHome } from "@/lib/session";

export interface DashboardAuthState {
  token: string | null;
  user: SafeUser | null;
  loading: boolean;
  error: string;
}

/**
 * Shared auth check for dashboard pages.
 * Reads sessionStorage for the access token, calls /auth/me,
 * and attempts a token refresh on 401 before redirecting to /login.
 */
export function useDashboardAuth(requiredRole?: string): DashboardAuthState {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const session = await loadSession();
        if (!session) {
          router.replace("/login");
          return;
        }

        if (requiredRole && !session.user.roles.includes(requiredRole)) {
          router.replace(roleHome(session.user));
          return;
        }

        setToken(session.token);
        setUser(session.user);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load session.",
        );
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [router, requiredRole]);

  return { token, user, loading, error };
}
