import { z } from "zod";

export const UpdateLanguagePreferenceSchema = z.object({
  preferred_language: z
    .string()
    .trim()
    .min(2, "Language code is required.")
    .max(10, "Language code is too long."),
});

export type UpdateLanguagePreferenceInput = z.infer<
  typeof UpdateLanguagePreferenceSchema
>;

export const LanguageCatalogQuerySchema = z.object({
  language: z.string().trim().min(2).max(10).optional(),
});
