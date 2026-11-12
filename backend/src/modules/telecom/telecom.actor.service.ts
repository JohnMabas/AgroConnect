import { env } from "../../config/env.js";
import { PhoneOtp, User } from "../../database/models/index.js";
import { getOrCreateProfile } from "../profiles/profiles.service.js";
import { fetchUserRoles } from "../../services/user-roles.service.js";
import { normalizePhoneNumber } from "../../utils/contact.js";
import type { TelecomActor, TelecomActorStatus } from "./telecom.types.js";

export function normalizeTelecomPhone(phoneNumber: string): string {
  try {
    return (
      normalizePhoneNumber(phoneNumber, env.DEFAULT_PHONE_COUNTRY) ??
      phoneNumber.trim()
    );
  } catch {
    return phoneNumber.trim();
  }
}

function hasRole(roles: string[], role: string): boolean {
  return roles.includes(role);
}

export function primaryTelecomRole(roles: string[]): "farmer" | "buyer" | "guest" {
  if (hasRole(roles, "farmer")) return "farmer";
  if (hasRole(roles, "buyer")) return "buyer";
  return "guest";
}

export async function resolveTelecomActor(
  phoneNumber: string,
): Promise<TelecomActor> {
  const normalizedPhone = normalizeTelecomPhone(phoneNumber);
  const user = await User.findOne({ where: { phone_number: normalizedPhone } });

  if (!user) {
    return {
      userId: null,
      roles: [],
      status: "guest",
      displayName: null,
      phoneNumber: normalizedPhone,
      language: "en",
    };
  }

  let status: TelecomActorStatus = "pending";
  if (user.status === "suspended") status = "suspended";
  else if (user.status === "active") status = "active";

  if (status === "pending") {
    const verified =
      (await PhoneOtp.count({
        where: { user_id: user.id, used: true },
      })) > 0;
    if (verified) status = "active";
  }

  const roles = status === "active" ? await fetchUserRoles(user.id) : [];
  let language = "en";
  try {
    const profile = await getOrCreateProfile(user.id);
    language = profile.preferred_language;
  } catch {
    // Profile lookup is non-fatal; English remains the safe fallback.
  }

  return {
    userId: user.id,
    roles,
    status,
    displayName: user.display_name ?? null,
    phoneNumber: user.phone_number ?? normalizedPhone,
    language,
  };
}

export async function refreshTelecomActor(
  userId: string,
  fallbackPhoneNumber: string,
): Promise<TelecomActor> {
  const user = await User.findByPk(userId);
  if (!user) return resolveTelecomActor(fallbackPhoneNumber);
  return resolveTelecomActor(user.phone_number ?? fallbackPhoneNumber);
}
