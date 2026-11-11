import { z } from "zod";

const uuid = z.string().uuid("Must be a valid UUID.");
const optionalText = (max: number) =>
  z.string().trim().max(max).optional();

export const AGENT_PERMISSION_KEYS = [
  "view_farm_profile",
  "manage_listings",
  "respond_to_offers",
  "coordinate_orders",
  "view_earnings",
  "contact_buyers",
  "share_market_info",
] as const;

export type AgentPermissionKey = (typeof AGENT_PERMISSION_KEYS)[number];

export const AgentPermissionKeySchema = z.enum(AGENT_PERMISSION_KEYS);

export const InviteAgentSchema = z.object({
  user_id: uuid,
  full_name: z.string().trim().min(2).max(200),
  phone_number: z.string().trim().min(7).max(32),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  operating_area: optionalText(200),
  appointment_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Appointment date must be YYYY-MM-DD.")
    .optional(),
  code_of_conduct_version: optionalText(50),
});

export type InviteAgentInput = z.infer<typeof InviteAgentSchema>;

export const VerifyAgentSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000).optional(),
});

export const AgentStatusActionSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const CreateRelationshipSchema = z.object({
  farmer_user_id: uuid.optional(),
  agent_user_id: uuid.optional(),
  cooperative_id: uuid,
  permissions: z.array(AgentPermissionKeySchema).min(1).optional(),
  expires_at: z.coerce.date().optional(),
});

export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>;

export const GrantConsentSchema = z.object({
  permissions: z.array(AgentPermissionKeySchema).min(1),
  method: z
    .enum(["in_app", "sms", "ussd", "voice", "cooperative_assisted"])
    .default("in_app"),
  expires_at: z.coerce.date().optional(),
});

export type GrantConsentInput = z.infer<typeof GrantConsentSchema>;

export const RevokeRelationshipSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const APPROVAL_ACTION_TYPES = [
  "listing_price_change",
  "listing_quantity_change",
  "listing_publish",
  "offer_acceptance",
  "offer_rejection",
  "order_cancellation",
  "fee_disclosure",
  "payment_destination_change",
] as const;

export type ApprovalActionType = (typeof APPROVAL_ACTION_TYPES)[number];

export const CreateApprovalSchema = z.object({
  farmer_user_id: uuid,
  cooperative_id: uuid,
  relationship_id: uuid.optional(),
  action_type: z.enum(APPROVAL_ACTION_TYPES),
  resource_type: z.string().trim().min(1).max(60),
  resource_id: uuid.optional(),
  proposed_values: z.record(z.unknown()),
  previous_values: z.record(z.unknown()).optional(),
  expires_in_minutes: z.coerce.number().int().min(5).max(10080).default(1440),
  idempotency_key: z.string().trim().min(8).max(128),
});

export type CreateApprovalInput = z.infer<typeof CreateApprovalSchema>;

export const DecideApprovalSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

export const ComplaintCategorySchema = z.enum([
  "unauthorized_account_access",
  "price_manipulation",
  "quantity_manipulation",
  "false_produce_listing",
  "unauthorized_offer_acceptance",
  "unauthorized_transaction_change",
  "payment_fraud",
  "hidden_commission",
  "agent_intimidation",
  "data_misuse",
  "cooperative_misconduct",
  "poor_agent_conduct",
  "other",
]);

export const CreateComplaintSchema = z.object({
  category: ComplaintCategorySchema,
  description: z.string().trim().min(20).max(10000),
  agent_user_id: uuid.optional(),
  cooperative_id: uuid.optional(),
  related_order_id: uuid.optional(),
  related_listing_id: uuid.optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

export const ComplaintEvidenceSchema = z.object({
  description: z.string().trim().max(2000).optional(),
});

export const UpdateComplaintSchema = z.object({
  status: z
    .enum([
      "acknowledged",
      "under_review",
      "awaiting_information",
      "resolved",
      "dismissed",
      "escalated",
    ])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigned_admin_user_id: uuid.optional(),
  resolution: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const AddInvestigationNoteSchema = z.object({
  action: z.string().trim().min(1).max(60),
  notes: z.string().trim().max(5000).optional(),
  decision: z.string().trim().max(60).optional(),
});

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().max(60).optional(),
});

export const FeeDisclosureSchema = z.object({
  farmer_user_id: uuid,
  cooperative_id: uuid.optional(),
  agent_user_id: uuid.optional(),
  order_id: uuid,
  fee_type: z.enum([
    "cooperative_service_fee",
    "agent_service_fee",
    "platform_commission",
    "other",
  ]),
  amount_minor: z.coerce.number().int().positive(),
  currency: z.string().trim().length(3).default("NGN"),
  description: z.string().trim().max(2000).optional(),
});
