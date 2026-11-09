import { z } from "zod";
import { env } from "../../config/env.js";

const uuid = z.string().uuid();

export const VerificationIdSchema = uuid;
export const VerificationDocumentIdSchema = uuid;

export const manualVerificationTypeSchema = z.enum([
  "farmer_identity",
  "buyer_business",
  "transporter",
  "cooperative",
]);

export const verificationStatusSchema = z.enum([
  "not_submitted",
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const verificationTypeSchema = z.enum([
  "phone",
  "email",
  "farmer_identity",
  "buyer_business",
  "transporter",
  "cooperative",
]);

export const documentTypeSchema = z.enum([
  "identity_document",
  "business_registration",
  "transport_permit",
  "cooperative_certificate",
  "supporting_document",
]);

export const SubmitVerificationSchema = z
  .object({
    verification_type: manualVerificationTypeSchema,
  })
  .strict();

export const UploadVerificationDocumentSchema = z
  .object({
    document_type: documentTypeSchema.default("supporting_document"),
  })
  .strict();

export const ListVerificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: verificationStatusSchema.optional(),
  verification_type: verificationTypeSchema.optional(),
  user_id: uuid.optional(),
});

export const ApproveVerificationSchema = z
  .object({
    note: z
      .string()
      .trim()
      .max(2_000)
      .nullable()
      .optional(),
  })
  .strict();

export const RejectVerificationSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3, "Provide a rejection reason with at least 3 characters.")
      .max(env.REPORT_DESCRIPTION_MAX_LENGTH),
  })
  .strict();
