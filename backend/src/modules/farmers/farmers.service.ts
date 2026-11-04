import {
  FarmerProfile,
  CooperativeMembership,
  CooperativeProfile,
} from "../../database/models/index.js";
import type { UpsertFarmerProfileInput } from "./farmers.validation.js";
import type { FarmerProfileData, FarmerVerificationStatus } from "./farmers.types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildFarmerProfileData(
  profile: FarmerProfile & {
    memberships?: Array<CooperativeMembership & { cooperative?: CooperativeProfile }>;
  },
): FarmerProfileData {
  const memberships = profile.memberships?.map((m) => ({
    cooperative_id: m.cooperative_id,
    cooperative_name: m.cooperative?.cooperative_name ?? m.cooperative_id,
    status: m.status ?? "pending",
  }));

  return {
    id: profile.id,
    user_id: profile.user_id,
    farm_name: profile.farm_name ?? null,
    farming_experience_years: profile.farming_experience_years ?? null,
    farm_location: profile.farm_location ?? null,
    farm_size: profile.farm_size != null ? Number(profile.farm_size) : null,
    farm_size_unit: profile.farm_size_unit ?? "hectares",
    primary_produce_interests: profile.primary_produce_interests ?? [],
    farming_description: profile.farming_description ?? null,
    verification_status: (profile.verification_status ?? "unverified") as FarmerVerificationStatus,
    cooperative_memberships: memberships,
    created_at: profile.created_at!,
    updated_at: profile.updated_at!,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Get the farmer profile for the given user, including cooperative memberships.
 * Throws NOT_FOUND if the profile does not exist.
 */
export async function getMyFarmerProfile(userId: string): Promise<FarmerProfileData> {
  const profile = await FarmerProfile.findOne({
    where: { user_id: userId },
    include: [
      {
        model: CooperativeMembership,
        as: "memberships",
        include: [
          {
            model: CooperativeProfile,
            as: "cooperative",
            attributes: ["id", "cooperative_name"],
          },
        ],
      },
    ],
  });

  if (!profile) {
    throw Object.assign(new Error("Farmer profile not found."), { code: "NOT_FOUND" });
  }

  return buildFarmerProfileData(
    profile as FarmerProfile & {
      memberships?: Array<CooperativeMembership & { cooperative?: CooperativeProfile }>;
    },
  );
}

/**
 * Create a new farmer profile. Throws DUPLICATE_PROFILE if one already exists.
 */
export async function createFarmerProfile(
  userId: string,
  data: UpsertFarmerProfileInput,
): Promise<FarmerProfileData> {
  const existing = await FarmerProfile.findOne({ where: { user_id: userId } });
  if (existing) {
    throw Object.assign(new Error("A farmer profile already exists for this account."), {
      code: "DUPLICATE_PROFILE",
    });
  }

  const profile = await FarmerProfile.create({
    user_id: userId,
    ...data,
    verification_status: "unverified",
  });

  return buildFarmerProfileData(profile);
}

/**
 * Update an existing farmer profile. Throws NOT_FOUND if the profile does not exist.
 */
export async function updateFarmerProfile(
  userId: string,
  data: UpsertFarmerProfileInput,
): Promise<FarmerProfileData> {
  const profile = await FarmerProfile.findOne({ where: { user_id: userId } });
  if (!profile) {
    throw Object.assign(new Error("Farmer profile not found."), { code: "NOT_FOUND" });
  }

  await profile.update(data);

  return buildFarmerProfileData(profile);
}
