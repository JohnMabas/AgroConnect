import { z } from "zod";
import { env } from "../../config/env.js";

const uuid = z.string().uuid("Must be a valid UUID.");
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");
const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO currency code.");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const conversationCategory = z.enum([
  "agroconnect_support",
  "agriculture",
  "market_intelligence",
  "general",
]);

export const AIConversationIdSchema = uuid;

export const CreateConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    category: conversationCategory.optional(),
  })
  .strict();

export const ConversationListQuerySchema = z.object({
  ...pagination,
  status: z.enum(["active", "archived"]).optional(),
});

export const SendConversationMessageSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message is required.")
      .max(
        env.AI_MAX_INPUT_LENGTH,
        `Message must be at most ${env.AI_MAX_INPUT_LENGTH} characters.`,
      ),
    context: z
      .object({
        produce_type_id: uuid.optional(),
        state_or_region: z.string().trim().max(150).optional(),
        currency: currency.optional(),
        unit: z.string().trim().max(50).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const RecommendationListQuerySchema = z
  .object({
    ...pagination,
    type: z
      .enum([
        "listing",
        "buyer_request",
        "market_opportunity",
        "price_alert",
        "platform_action",
      ])
      .optional(),
    status: z.enum(["active", "dismissed", "completed", "expired"]).optional(),
  })
  .strict();

export const GenerateRecommendationsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict()
  .default({ limit: 10 });

export const AdminGenerateRecommendationsSchema = z
  .object({
    user_id: uuid.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

export const RecommendationIdSchema = uuid;

export const IntegrityListQuerySchema = z
  .object({
    ...pagination,
    subject_user_id: uuid.optional(),
    risk_category: z
      .enum([
        "price_anomaly",
        "duplicate_listing",
        "review_manipulation",
        "payment_abuse",
        "spam_activity",
        "verification_anomaly",
        "other",
      ])
      .optional(),
    risk_level: z.enum(["low", "medium", "high", "critical"]).optional(),
    review_status: z
      .enum(["pending", "under_review", "resolved", "false_positive", "escalated"])
      .optional(),
    date_from: dateOnly.optional(),
    date_to: dateOnly.optional(),
    sort: z.enum(["newest", "risk_desc"]).default("newest"),
  })
  .refine(
    (value) =>
      value.date_from === undefined ||
      value.date_to === undefined ||
      value.date_from <= value.date_to,
    { message: "date_from must not be after date_to.", path: ["date_from"] },
  );

export const IntegrityAssessmentIdSchema = uuid;

export const AssessUserIntegritySchema = z
  .object({
    lookback_days: z.coerce.number().int().min(1).max(365).default(90),
  })
  .strict()
  .default({ lookback_days: 90 });

export const ReviewIntegritySchema = z
  .object({
    action: z.enum([
      "start_review",
      "resolve",
      "mark_false_positive",
      "escalate",
      "add_note",
    ]),
    notes: z.string().trim().max(2_000).optional(),
    assigned_admin_user_id: uuid.optional(),
    false_positive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      ["start_review"].includes(value.action) ||
      (value.notes !== undefined && value.notes.length >= 3),
    {
      message: "Provide notes with at least 3 characters for this review action.",
      path: ["notes"],
    },
  );

export const SearchKnowledgeQuerySchema = z
  .object({
    q: z.string().trim().max(500).optional(),
    topic: z.string().trim().max(100).optional(),
    crop: z.string().trim().max(120).optional(),
    region: z.string().trim().max(150).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(20)
      .default(env.AI_KNOWLEDGE_SEARCH_LIMIT),
  })
  .strict();

export const AdminKnowledgeListQuerySchema = z
  .object({
    ...pagination,
    status: z.enum(["pending", "approved", "rejected", "archived"]).optional(),
    topic: z.string().trim().max(100).optional(),
    crop: z.string().trim().max(120).optional(),
    region: z.string().trim().max(150).optional(),
    search: z.string().trim().max(300).optional(),
  })
  .strict();

const knowledgeBase = {
  title: z.string().trim().min(3).max(250),
  summary: z.string().trim().max(2_000).nullish(),
  content: z.string().trim().min(10).max(20_000),
  topic: z.string().trim().min(2).max(100),
  crop: z.string().trim().max(120).nullish(),
  region: z.string().trim().max(150).nullish(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  source_name: z.string().trim().max(250).nullish(),
  source_url: z.string().trim().url("Must be a valid URL.").max(700).nullish(),
  publication_date: dateOnly.nullish(),
  review_date: dateOnly.nullish(),
  metadata: z.record(z.unknown()).nullish(),
};

export const CreateKnowledgeSchema = z.object(knowledgeBase).strict();

export const UpdateKnowledgeSchema = z
  .object({
    title: knowledgeBase.title.optional(),
    summary: knowledgeBase.summary.optional(),
    content: knowledgeBase.content.optional(),
    topic: knowledgeBase.topic.optional(),
    crop: knowledgeBase.crop.optional(),
    region: knowledgeBase.region.optional(),
    tags: knowledgeBase.tags,
    source_name: knowledgeBase.source_name.optional(),
    source_url: knowledgeBase.source_url.optional(),
    publication_date: knowledgeBase.publication_date.optional(),
    review_date: knowledgeBase.review_date.optional(),
    metadata: knowledgeBase.metadata.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const RejectKnowledgeSchema = z
  .object({
    reason: z.string().trim().min(3).max(2_000),
  })
  .strict();

export const KnowledgeIdSchema = uuid;

export const UpdateAIConfigurationSchema = z
  .object({
    assistant_enabled: z.boolean().optional(),
    recommendations_enabled: z.boolean().optional(),
    integrity_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one AI feature flag to update.",
  });

export const AIUsageQuerySchema = z
  .object({
    ...pagination,
    user_id: uuid.optional(),
    feature: z
      .enum(["assistant", "recommendations", "integrity", "knowledge"])
      .optional(),
    status: z.enum(["success", "error", "fallback", "blocked"]).optional(),
    date_from: dateOnly.optional(),
    date_to: dateOnly.optional(),
  })
  .refine(
    (value) =>
      value.date_from === undefined ||
      value.date_to === undefined ||
      value.date_from <= value.date_to,
    { message: "date_from must not be after date_to.", path: ["date_from"] },
  );

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type ConversationListQuery = z.infer<
  typeof ConversationListQuerySchema
>;
export type SendConversationMessageInput = z.infer<
  typeof SendConversationMessageSchema
>;
export type RecommendationListQuery = z.infer<
  typeof RecommendationListQuerySchema
>;
export type GenerateRecommendationsInput = z.infer<
  typeof GenerateRecommendationsSchema
>;
export type AdminGenerateRecommendationsInput = z.infer<
  typeof AdminGenerateRecommendationsSchema
>;
export type IntegrityListQuery = z.infer<typeof IntegrityListQuerySchema>;
export type AssessUserIntegrityInput = z.infer<
  typeof AssessUserIntegritySchema
>;
export type ReviewIntegrityInput = z.infer<typeof ReviewIntegritySchema>;
export type SearchKnowledgeQuery = z.infer<
  typeof SearchKnowledgeQuerySchema
>;
export type AdminKnowledgeListQuery = z.infer<
  typeof AdminKnowledgeListQuerySchema
>;
export type CreateKnowledgeInput = z.infer<typeof CreateKnowledgeSchema>;
export type UpdateKnowledgeInput = z.infer<typeof UpdateKnowledgeSchema>;
export type UpdateAIConfigurationInput = z.infer<
  typeof UpdateAIConfigurationSchema
>;
export type AIUsageQuery = z.infer<typeof AIUsageQuerySchema>;
