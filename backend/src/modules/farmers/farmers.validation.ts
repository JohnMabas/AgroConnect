import { z } from "zod";

export const UpsertFarmerProfileSchema = z.object({
  farm_name: z.string().trim().max(200, "Farm name must be at most 200 characters.").optional(),
  farming_experience_years: z
    .number()
    .int("Farming experience must be a whole number.")
    .min(0, "Farming experience cannot be negative.")
    .max(100, "Farming experience must be at most 100 years.")
    .optional(),
  farm_location: z.string().trim().optional(),
  farm_size: z
    .number()
    .min(0, "Farm size cannot be negative.")
    .optional(),
  farm_size_unit: z
    .string()
    .trim()
    .max(50, "Farm size unit must be at most 50 characters.")
    .optional(),
  primary_produce_interests: z
    .array(z.string().trim().max(100, "Each produce interest must be at most 100 characters."))
    .optional(),
  farming_description: z.string().trim().optional(),
});

export type UpsertFarmerProfileInput = z.infer<typeof UpsertFarmerProfileSchema>;
