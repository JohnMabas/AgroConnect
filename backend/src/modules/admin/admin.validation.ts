import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const uuid = z.string().uuid();

export const AdminUsersQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(150).optional(),
  role: z
    .enum([
      "farmer",
      "buyer",
      "cooperative",
      "cooperative_agent",
      "transporter",
      "admin",
    ])
    .optional(),
  status: z.enum(["pending", "active", "suspended"]).optional(),
});

export const AdminUserStatusSchema = z
  .object({
    status: z.enum(["active", "suspended"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine(
    (value) =>
      value.status === "active" ||
      (value.reason !== undefined && value.reason.length >= 3),
    {
      message: "A suspension reason of at least 3 characters is required.",
      path: ["reason"],
    },
  );

export const AdminTransportersQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(150).optional(),
  status: z
    .enum(["pending", "approved", "rejected", "suspended"])
    .optional(),
});

export const AdminRejectTransporterSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "A rejection reason is required.")
    .max(1000),
});

export const AdminListingsQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(150).optional(),
  status: z
    .enum(["draft", "published", "paused", "sold_out", "closed", "expired"])
    .optional(),
  farmer_user_id: uuid.optional(),
});

export const AdminModerateListingSchema = z.object({
  action: z.enum(["hide", "restore"]),
  reason: z
    .string()
    .trim()
    .min(3, "A moderation reason of at least 3 characters is required.")
    .max(1000),
});

export const AdminOrdersQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(150).optional(),
  status: z
    .enum([
      "pending_payment",
      "paid",
      "processing",
      "ready_for_delivery",
      "in_transit",
      "delivered",
      "completed",
      "cancelled",
      "payment_failed",
      "refunded",
    ])
    .optional(),
  payment_status: z
    .enum(["pending", "paid", "failed", "refunded", "partially_refunded"])
    .optional(),
});

export const AdminPaymentsQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(150).optional(),
  status: z
    .enum([
      "pending",
      "success",
      "failed",
      "abandoned",
      "refunded",
      "partially_refunded",
    ])
    .optional(),
});

export const AdminAuditLogsQuerySchema = z.object({
  ...pagination,
  action: z.string().trim().max(80).optional(),
  entity_type: z.string().trim().max(60).optional(),
  admin_user_id: uuid.optional(),
});

export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;
export type AdminUserStatusInput = z.infer<typeof AdminUserStatusSchema>;
export type AdminTransportersQuery = z.infer<
  typeof AdminTransportersQuerySchema
>;
export type AdminRejectTransporterInput = z.infer<
  typeof AdminRejectTransporterSchema
>;
export type AdminListingsQuery = z.infer<typeof AdminListingsQuerySchema>;
export type AdminModerateListingInput = z.infer<
  typeof AdminModerateListingSchema
>;
export type AdminOrdersQuery = z.infer<typeof AdminOrdersQuerySchema>;
export type AdminPaymentsQuery = z.infer<typeof AdminPaymentsQuerySchema>;
export type AdminAuditLogsQuery = z.infer<typeof AdminAuditLogsQuerySchema>;
