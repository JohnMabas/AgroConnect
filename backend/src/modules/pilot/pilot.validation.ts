import { z } from "zod";

const uuid = z.string().uuid("Must be a valid UUID.");
const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");
const optionalText = (max: number) => z.string().trim().max(max).optional();
const nullableDateOnly = dateOnly.nullable().optional();

export const PILOT_CONFIGURATION_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export const PILOT_PARTICIPANT_TYPES = [
  "farmer",
  "buyer",
  "cooperative",
  "cooperative_agent",
  "transporter",
  "administrator",
] as const;

export const PILOT_PARTICIPANT_STATUSES = [
  "invited",
  "pending_consent",
  "approved",
  "active",
  "suspended",
  "removed",
] as const;

export const PILOT_FEEDBACK_CATEGORIES = [
  "registration",
  "listing",
  "finding_buyers",
  "communication",
  "payment",
  "delivery",
  "ussd",
  "voice",
  "agent_misconduct",
  "general",
] as const;

export const PILOT_FEEDBACK_SEVERITIES = [
  "low",
  "normal",
  "high",
  "critical",
] as const;

export const PILOT_FEEDBACK_STATUSES = [
  "new",
  "acknowledged",
  "under_review",
  "in_progress",
  "resolved",
  "closed",
] as const;

export const CreatePilotConfigurationSchema = z
  .object({
    name: z.string().trim().min(3).max(150),
    status: z.enum(PILOT_CONFIGURATION_STATUSES).optional(),
    country: z.string().trim().min(2).max(100).default("Nigeria"),
    state_or_region: z.string().trim().min(2).max(150).default("Plateau"),
    start_date: nullableDateOnly,
    end_date: nullableDateOnly,
    locations: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
    produce_category_ids: z.array(uuid).max(100).default([]),
    notes: optionalText(5000),
    is_active: z.boolean().default(false),
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.end_date ||
      value.start_date <= value.end_date,
    {
      message: "End date must be on or after the start date.",
      path: ["end_date"],
    },
  );

export type CreatePilotConfigurationInput = z.infer<
  typeof CreatePilotConfigurationSchema
>;

export const UpdatePilotConfigurationSchema = z
  .object({
    name: z.string().trim().min(3).max(150).optional(),
    status: z.enum(PILOT_CONFIGURATION_STATUSES).optional(),
    country: z.string().trim().min(2).max(100).optional(),
    state_or_region: z.string().trim().min(2).max(150).optional(),
    start_date: nullableDateOnly,
    end_date: nullableDateOnly,
    locations: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
    produce_category_ids: z.array(uuid).max(100).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.start_date === undefined ||
      value.end_date === undefined ||
      value.start_date === null ||
      value.end_date === null ||
      value.start_date <= value.end_date,
    {
      message: "End date must be on or after the start date.",
      path: ["end_date"],
    },
  );

export type UpdatePilotConfigurationInput = z.infer<
  typeof UpdatePilotConfigurationSchema
>;

export const AddPilotParticipantSchema = z.object({
  user_id: uuid,
  participant_type: z.enum(PILOT_PARTICIPANT_TYPES),
  status: z.enum(PILOT_PARTICIPANT_STATUSES).default("approved"),
  consent_confirmed: z.boolean().default(false),
  consent_version: optionalText(50),
  notes: optionalText(2000),
});

export type AddPilotParticipantInput = z.infer<
  typeof AddPilotParticipantSchema
>;

export const UpdatePilotParticipantSchema = z.object({
  status: z.enum(PILOT_PARTICIPANT_STATUSES).optional(),
  consent_confirmed: z.boolean().optional(),
  consent_version: optionalText(50),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type UpdatePilotParticipantInput = z.infer<
  typeof UpdatePilotParticipantSchema
>;

export const CreatePilotFeedbackSchema = z.object({
  category: z.enum(PILOT_FEEDBACK_CATEGORIES),
  description: z.string().trim().min(10).max(10000),
  severity: z.enum(PILOT_FEEDBACK_SEVERITIES).default("normal"),
  related_complaint_id: uuid.optional(),
});

export type CreatePilotFeedbackInput = z.infer<
  typeof CreatePilotFeedbackSchema
>;

export const UpdatePilotFeedbackSchema = z.object({
  status: z.enum(PILOT_FEEDBACK_STATUSES).optional(),
  severity: z.enum(PILOT_FEEDBACK_SEVERITIES).optional(),
  assigned_admin_user_id: uuid.nullable().optional(),
  resolution_notes: z.string().trim().max(5000).nullable().optional(),
  related_complaint_id: uuid.nullable().optional(),
});

export type UpdatePilotFeedbackInput = z.infer<
  typeof UpdatePilotFeedbackSchema
>;

export const ListPilotFeedbackSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PILOT_FEEDBACK_STATUSES).optional(),
  category: z.enum(PILOT_FEEDBACK_CATEGORIES).optional(),
  severity: z.enum(PILOT_FEEDBACK_SEVERITIES).optional(),
  user_id: uuid.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListPilotFeedbackInput = z.infer<typeof ListPilotFeedbackSchema>;

export const ListPilotParticipantsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PILOT_PARTICIPANT_STATUSES).optional(),
  participant_type: z.enum(PILOT_PARTICIPANT_TYPES).optional(),
});

export type ListPilotParticipantsInput = z.infer<
  typeof ListPilotParticipantsSchema
>;

export const ListPilotConfigurationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PILOT_CONFIGURATION_STATUSES).optional(),
});

export type ListPilotConfigurationsInput = z.infer<
  typeof ListPilotConfigurationsSchema
>;

export const ReadinessOverrideSchema = z.object({
  testing_status: z
    .enum([
      "implemented_not_tested",
      "testing_in_progress",
      "passed",
      "blocked",
      "sandbox_tested_only",
    ])
    .optional(),
  integration_status: z
    .enum(["integrated", "sandbox_only", "not_configured", "blocked"])
    .optional(),
  pilot_readiness: z
    .enum([
      "not_implemented",
      "implemented_not_tested",
      "testing_in_progress",
      "passed",
      "blocked",
      "sandbox_tested_only",
      "prepared_awaiting_provider_approval",
      "ready_for_controlled_pilot",
    ])
    .optional(),
  known_issues: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  evidence: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ReadinessOverrideInput = z.infer<typeof ReadinessOverrideSchema>;
