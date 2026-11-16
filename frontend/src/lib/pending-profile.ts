import {
  ApiError,
  cooperativeApi,
  farmerApi,
  transporterApi,
} from "@/lib/api";

export type PendingProfileKind = "farmer" | "cooperative" | "transporter";

interface PendingProfile {
  kind: PendingProfileKind;
  data: Record<string, unknown>;
}

const PENDING_PROFILE_KEY = "pending_profile";
const LEGACY_COOPERATIVE_KEY = "pending_cooperative";

export interface PendingProfileResult {
  attempted: boolean;
  completed: boolean;
  error?: string;
}

export function storePendingProfile(
  kind: PendingProfileKind,
  data: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ kind, data }));
}

export function getPendingProfile(): PendingProfile | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(PENDING_PROFILE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PendingProfile>;
      if (
        parsed.kind === "farmer" ||
        parsed.kind === "cooperative" ||
        parsed.kind === "transporter"
      ) {
        return {
          kind: parsed.kind,
          data:
            parsed.data && typeof parsed.data === "object"
              ? (parsed.data as Record<string, unknown>)
              : {},
        };
      }
    } catch {
      // Ignore malformed pending data.
    }
  }

  const legacy = sessionStorage.getItem(LEGACY_COOPERATIVE_KEY);
  if (legacy) {
    try {
      const data = JSON.parse(legacy) as Record<string, unknown>;
      delete data.user_id;
      return { kind: "cooperative", data };
    } catch {
      // Ignore malformed legacy pending data.
    }
  }

  return null;
}

export function clearPendingProfile(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_PROFILE_KEY);
  sessionStorage.removeItem(LEGACY_COOPERATIVE_KEY);
}

export async function completePendingProfile(
  token: string,
): Promise<PendingProfileResult> {
  const pending = getPendingProfile();
  if (!pending) {
    return { attempted: false, completed: false };
  }

  try {
    if (pending.kind === "farmer") {
      await farmerApi.create(token, pending.data);
    } else if (pending.kind === "cooperative") {
      const data = { ...pending.data };
      delete data.agricultural_focus;
      await cooperativeApi.create(token, data);
    } else {
      await transporterApi.create(token, pending.data);
    }

    clearPendingProfile();
    return { attempted: true, completed: true };
  } catch (err) {
    const apiErr = err as ApiError;
    if (apiErr.status === 409) {
      clearPendingProfile();
      return { attempted: true, completed: true };
    }
    return {
      attempted: true,
      completed: false,
      error: apiErr.message ?? "Could not complete your profile setup.",
    };
  }
}
