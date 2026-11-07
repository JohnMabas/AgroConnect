import { z } from "zod";

const uuid = z.string().uuid();

const orderStatus = z.enum([
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
]);

const orderPaymentStatus = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const CreateOrderSchema = z.object({
  offer_id: uuid,
});

export const OrderIdSchema = uuid;

export const ListOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: orderStatus.optional(),
  payment_status: orderPaymentStatus.optional(),
  role: z.enum(["buyer", "farmer"]).optional(),
  listing_id: uuid.optional(),
  offer_id: uuid.optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "processing",
    "ready_for_delivery",
    "in_transit",
    "delivered",
    "completed",
  ]),
});

export const CancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Cancellation reason is required.")
    .max(2000, "Cancellation reason must be at most 2000 characters."),
});

export const ListReservationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z
    .enum(["active", "released", "expired", "consumed", "void"])
    .optional(),
  order_id: uuid.optional(),
  listing_id: uuid.optional(),
});

export const PaymentReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(100);

export const InitializePaymentSchema = z.object({
  order_id: uuid,
});

export const RefundRequestSchema = z.object({
  amount: z.number().finite().positive().optional(),
  customer_note: z
    .string()
    .trim()
    .max(2000)
    .nullish(),
  merchant_note: z
    .string()
    .trim()
    .max(2000)
    .nullish(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export type ListReservationsQuery = z.infer<
  typeof ListReservationsQuerySchema
>;
export type InitializePaymentInput = z.infer<typeof InitializePaymentSchema>;
export type RefundRequestInput = z.infer<typeof RefundRequestSchema>;
