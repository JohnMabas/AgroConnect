import { UserProfile } from "../../database/models/index.js";
import { publicImageStorage } from "../../integrations/storage/index.js";
import { validatePublicImageUpload } from "../uploads/public-image.validation.js";
import { deletePublicImageBestEffort } from "../uploads/public-image.cleanup.js";
import type { UpsertProfileInput } from "./profiles.validation.js";
import type { UserProfileData } from "./profiles.types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildProfileData(profile: UserProfile): UserProfileData {
  return {
    id: profile.id,
    user_id: profile.user_id,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
    display_name: profile.display_name ?? null,
    profile_image_url: profile.profile_image_url ?? null,
    profile_image_public_id: profile.profile_image_public_id ?? null,
    country: profile.country ?? null,
    state_or_region: profile.state_or_region ?? null,
    local_government_area: profile.local_government_area ?? null,
    city_or_community: profile.city_or_community ?? null,
    preferred_language: profile.preferred_language ?? "en",
    created_at: profile.created_at!,
    updated_at: profile.updated_at!,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Find the user's profile, or create a blank one if it doesn't exist yet.
 */
export async function getOrCreateProfile(userId: string): Promise<UserProfileData> {
  const [profile] = await UserProfile.findOrCreate({
    where: { user_id: userId },
    defaults: {
      user_id: userId,
      preferred_language: "en",
    },
  });

  return buildProfileData(profile);
}

/**
 * Update a user's profile fields (partial update — only provided fields are written).
 */
export async function updateProfile(
  userId: string,
  data: UpsertProfileInput,
): Promise<UserProfileData> {
  const [profile] = await UserProfile.findOrCreate({
    where: { user_id: userId },
    defaults: {
      user_id: userId,
      preferred_language: "en",
    },
  });

  await profile.update(data);

  return buildProfileData(profile);
}

export async function setProfileImage(
  userId: string,
  file: Express.Multer.File | undefined,
): Promise<UserProfileData> {
  const [profile] = await UserProfile.findOrCreate({
    where: { user_id: userId },
    defaults: {
      user_id: userId,
      preferred_language: "en",
    },
  });

  const detected = validatePublicImageUpload(file);
  const stored = await publicImageStorage.saveImage({
    folder: "profiles",
    buffer: file!.buffer,
    mimeType: detected.mimeType,
    extension: detected.extension,
    ownerId: userId,
  });

  const previousPublicId = profile.profile_image_public_id;
  try {
    await profile.update({
      profile_image_url: stored.imageUrl,
      profile_image_public_id: stored.publicId,
    });
  } catch (err) {
    await deletePublicImageBestEffort(stored.publicId, "profile replacement");
    throw err;
  }
  await deletePublicImageBestEffort(previousPublicId, "profile");
  return buildProfileData(profile);
}

export async function deleteProfileImage(userId: string): Promise<UserProfileData> {
  const profile = await UserProfile.findOne({ where: { user_id: userId } });
  if (!profile) {
    throw Object.assign(new Error("Profile not found."), { code: "NOT_FOUND" });
  }

  const previousPublicId = profile.profile_image_public_id;
  await profile.update({ profile_image_url: null, profile_image_public_id: null });
  await deletePublicImageBestEffort(previousPublicId, "profile");

  return buildProfileData(profile);
}
