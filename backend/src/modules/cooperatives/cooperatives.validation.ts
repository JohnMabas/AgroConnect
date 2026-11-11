import { z } from "zod";

// ─── Cooperative schemas ──────────────────────────────────────────────────────

export const CreateCooperativeSchema = z.object({
  cooperative_name: z
    .string()
    .trim()
    .min(2, "Cooperative name must be at least 2 characters.")
    .max(200, "Cooperative name must be at most 200 characters."),
  registration_number: z.string().trim().max(100, "Registration number must be at most 100 characters.").optional(),
  description: z.string().trim().optional(),
  country: z.string().trim().max(100, "Country must be at most 100 characters.").optional(),
  state_or_region: z.string().trim().max(150, "State or region must be at most 150 characters.").optional(),
  local_government_area: z.string().trim().max(150, "Local government area must be at most 150 characters.").optional(),
  community: z.string().trim().max(150, "Community must be at most 150 characters.").optional(),
  address: z.string().trim().optional(),
  contact_person_name: z
    .string()
    .trim()
    .min(2, "Contact person name must be at least 2 characters.")
    .max(200, "Contact person name must be at most 200 characters.")
    .optional(),
  date_of_registration: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Registration date must be in YYYY-MM-DD format.")
    .optional(),
  contact_phone: z.string().trim().max(32, "Contact phone must be at most 32 characters.").optional(),
  contact_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Contact email must be a valid email address.")
    .max(254, "Contact email must be at most 254 characters.")
    .optional(),
  logo_url: z
    .string()
    .trim()
    .url("Logo URL must be a valid URL.")
    .max(512, "Logo URL must be at most 512 characters.")
    .optional(),
});

export type CreateCooperativeInput = z.infer<typeof CreateCooperativeSchema>;

export const UpdateCooperativeSchema = CreateCooperativeSchema.partial();
export type UpdateCooperativeInput = z.infer<typeof UpdateCooperativeSchema>;

// ─── Membership schemas ───────────────────────────────────────────────────────

export const UpdateMembershipSchema = z.object({
  status: z.enum(["active", "rejected", "suspended", "left"], {
    errorMap: () => ({ message: "Invalid membership status." }),
  }),
});

export type UpdateMembershipInput = z.infer<typeof UpdateMembershipSchema>;

// ─── Agent schemas ────────────────────────────────────────────────────────────

export const AssignAgentSchema = z.object({
  agent_user_id: z.string().uuid("Agent user ID must be a valid UUID."),
});

export type AssignAgentInput = z.infer<typeof AssignAgentSchema>;

// ─── Admin schemas ────────────────────────────────────────────────────────────

export const AdminReviewSchema = z.object({
  notes: z.string().trim().optional(),
});

export type AdminReviewInput = z.infer<typeof AdminReviewSchema>;

export const AdminRejectSchema = z.object({
  notes: z.string().trim().min(1, "Rejection notes are required."),
});

export type AdminRejectInput = z.infer<typeof AdminRejectSchema>;
