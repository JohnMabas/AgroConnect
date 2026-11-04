"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, type SafeUser, type ApiError } from "@/lib/api";

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
      const stored = sessionStorage.getItem("access_token");
      if (!stored) {
        router.replace("/login");
        return;
      }

      let currentToken = stored;

      try {
        const res = await authApi.me(currentToken);
        const me = res.data.user;

        // Role-gating
        if (requiredRole && !me.roles.includes(requiredRole)) {
          router.replace("/profile");
          return;
        }

        setToken(currentToken);
        setUser(me);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.status === 401) {
          // Try refresh
          try {
            const refreshRes = await authApi.refresh();
            currentToken = refreshRes.data.access_token;
            sessionStorage.setItem("access_token", currentToken);
            const me = refreshRes.data.user;

            if (requiredRole && !me.roles.includes(requiredRole)) {
              router.replace("/profile");
              return;
            }

            setToken(currentToken);
            setUser(me);
          } catch {
            sessionStorage.removeItem("access_token");
            router.replace("/login");
          }
        } else {
          setError(apiErr.message ?? "Failed to load session.");
        }
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [router, requiredRole]);

  return { token, user, loading, error };
}
