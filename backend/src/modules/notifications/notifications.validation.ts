import { z } from "zod";

const uuid = z.string().uuid();

const optionalBooleanQuery = z
  .enum(["true", "false"])
  .optional()
  .transform((value) =>
    value === undefined ? undefined : value === "true",
  );

export const NotificationIdSchema = uuid;
export const NotificationDeliveryIdSchema = uuid;

export const ListNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread: optionalBooleanQuery,
  notification_type: z.string().trim().max(60).optional(),
});

export const UpdateNotificationPreferencesSchema = z
  .object({
    in_app_enabled: z.boolean().optional(),
    email_enabled: z.boolean().optional(),
    sms_enabled: z.boolean().optional(),
    offers_enabled: z.boolean().optional(),
    messages_enabled: z.boolean().optional(),
    orders_enabled: z.boolean().optional(),
    payments_enabled: z.boolean().optional(),
    deliveries_enabled: z.boolean().optional(),
    reviews_enabled: z.boolean().optional(),
    verifications_enabled: z.boolean().optional(),
    marketing_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one notification preference to update.",
  });

export const AdminListDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  delivery_status: z
    .enum(["pending", "sent", "delivered", "failed", "skipped"])
    .optional(),
  channel: z.enum(["in_app", "email", "sms"]).optional(),
});
