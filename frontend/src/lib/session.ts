import { ApiError, authApi, type SafeUser } from "@/lib/api";

export const ACCESS_TOKEN_KEY = "access_token";

const ROLE_PRIORITY = [
  "admin",
  "cooperative_agent",
  "cooperative",
  "farmer",
  "transporter",
  "buyer",
] as const;

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/cooperatives",
  cooperative_agent: "/agent/dashboard",
  cooperative: "/cooperatives/dashboard",
  farmer: "/farmer/listings",
  transporter: "/transporter/dashboard",
  buyer: "/buyer/dashboard",
};

export interface SessionData {
  token: string;
  user: SafeUser;
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function primaryRole(user: SafeUser): string | undefined {
  return ROLE_PRIORITY.find((role) => user.roles.includes(role));
}

export function roleHome(user: SafeUser): string {
  const role = primaryRole(user);
  return role ? (ROLE_HOME[role] ?? "/account") : "/account";
}

export function resolvePostLoginPath(
  user: SafeUser,
  requestedPath: string | null,
): string {
  if (
    requestedPath &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    requestedPath !== "/account"
  ) {
    return requestedPath;
  }
  return roleHome(user);
}

/**
 * Load the current session from sessionStorage. A 401 triggers one refresh
 * attempt using the HttpOnly refresh cookie.
 */
export async function loadSession(): Promise<SessionData | null> {
  const stored = getStoredAccessToken();
  if (!stored) return null;

  try {
    const res = await authApi.me(stored);
    return { token: stored, user: res.data.user };
  } catch (err) {
    if ((err as ApiError).status !== 401) {
      throw err;
    }

    try {
      const refreshed = await authApi.refresh();
      storeAccessToken(refreshed.data.access_token);
      return {
        token: refreshed.data.access_token,
        user: refreshed.data.user,
      };
    } catch {
      clearAccessToken();
      return null;
    }
  }
}

export async function signOut(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Best-effort: local session is cleared regardless.
  }
  clearAccessToken();
}
