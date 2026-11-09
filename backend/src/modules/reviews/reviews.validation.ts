import { z } from "zod";
import { env } from "../../config/env.js";

const uuid = z.string().uuid();

const optionalBooleanQuery = z
  .enum(["true", "false"])
  .optional()
  .transform((value) =>
    value === undefined ? undefined : value === "true",
  );

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be at most ${max} characters.`)
    .nullable()
    .optional();

const reportReasonSchema = z.enum([
  "abusive_language",
  "harassment",
  "spam",
  "false_misleading",
  "personal_information",
  "other",
]);

const reportStatusSchema = z.enum([
  "pending",
  "under_review",
  "resolved",
  "dismissed",
]);

const reviewSortSchema = z
  .enum(["newest", "oldest", "highest", "lowest"])
  .default("newest");

export const ReviewIdSchema = uuid;
export const ReviewReportIdSchema = uuid;

export const CreateReviewSchema = z
  .object({
    order_id: uuid,
    delivery_id: uuid.nullable().optional(),
    reviewed_user_id: uuid.optional(),
    rating: z.coerce
      .number()
      .int()
      .min(1, "Rating must be between 1 and 5.")
      .max(5, "Rating must be between 1 and 5."),
    review_title: optionalText(env.REVIEW_TITLE_MAX_LENGTH),
    review_comment: optionalText(env.REVIEW_COMMENT_MAX_LENGTH),
  })
  .strict();

export const UpdateReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    review_title: optionalText(env.REVIEW_TITLE_MAX_LENGTH),
    review_comment: optionalText(env.REVIEW_COMMENT_MAX_LENGTH),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one review field to update.",
  });

export const ListUserReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sort: reviewSortSchema,
});

export const ListMyReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: reviewSortSchema,
});

export const ReportReviewSchema = z
  .object({
    reason: reportReasonSchema,
    description: optionalText(env.REPORT_DESCRIPTION_MAX_LENGTH),
  })
  .strict();

export const AdminListReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    user_id: uuid.optional(),
    reviewer_id: uuid.optional(),
    order_id: uuid.optional(),
    hidden: optionalBooleanQuery,
    min_rating: z.coerce.number().int().min(1).max(5).optional(),
    max_rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: reviewSortSchema,
  })
  .refine(
    (value) =>
      value.min_rating === undefined ||
      value.max_rating === undefined ||
      value.min_rating <= value.max_rating,
    { message: "min_rating must not exceed max_rating." },
  );

export const AdminListReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: reportStatusSchema.optional(),
  reason: reportReasonSchema.optional(),
  review_id: uuid.optional(),
  reporter_id: uuid.optional(),
});

export const UpdateReportStatusSchema = z
  .object({
    status: z.enum(["under_review", "resolved", "dismissed"]),
    resolution_note: optionalText(2_000),
  })
  .strict();

export const HideReviewSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3, "Provide a reason with at least 3 characters.")
      .max(env.REPORT_DESCRIPTION_MAX_LENGTH),
  })
  .strict();
