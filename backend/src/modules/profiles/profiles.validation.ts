import { z } from "zod";

export const UpsertProfileSchema = z.object({
  first_name: z.string().trim().max(100, "First name must be at most 100 characters.").optional(),
  last_name: z.string().trim().max(100, "Last name must be at most 100 characters.").optional(),
  display_name: z.string().trim().max(150, "Display name must be at most 150 characters.").optional(),
  profile_image_url: z.string().trim().url("Profile image URL must be a valid URL.").max(512, "Profile image URL must be at most 512 characters.").optional(),
  country: z.string().trim().max(100, "Country must be at most 100 characters.").optional(),
  state_or_region: z.string().trim().max(150, "State or region must be at most 150 characters.").optional(),
  local_government_area: z.string().trim().max(150, "Local government area must be at most 150 characters.").optional(),
  city_or_community: z.string().trim().max(150, "City or community must be at most 150 characters.").optional(),
  preferred_language: z.string().trim().max(50, "Preferred language must be at most 50 characters.").optional(),
});

export type UpsertProfileInput = z.infer<typeof UpsertProfileSchema>;
