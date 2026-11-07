import { z } from "zod";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");

const expiresAt = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isNaN(Date.parse(value)),
    "expires_at must be an ISO 8601 timestamp or YYYY-MM-DD date.",
  )
  .transform((value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T23:59:59.999Z`)
      : new Date(value),
  );

const offerTerms = {
  quantity: z
    .number()
    .finite("Quantity must be a finite number.")
    .positive("Quantity must be greater than zero."),
  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(50, "Unit must be at most 50 characters."),
  unit_price: z
    .number()
    .finite("Unit price must be a finite number.")
    .positive("Unit price must be greater than zero."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO currency code.")
    .optional(),
  delivery_terms: z
    .string()
    .trim()
    .max(2000, "Delivery terms must be at most 2000 characters.")
    .nullish(),
  delivery_location: z
    .string()
    .trim()
    .max(500, "Delivery location must be at most 500 characters.")
    .nullish(),
  delivery_date: dateOnly.nullish(),
  buyer_message: z
    .string()
    .trim()
    .max(2000, "Offer message must be at most 2000 characters.")
    .nullish(),
  expires_at: expiresAt.optional(),
};

export const CreateOfferSchema = z
  .object({
    listing_id: z.string().uuid("listing_id must be a valid UUID.").nullish(),
    buyer_request_id: z
      .string()
      .uuid("buyer_request_id must be a valid UUID.")
      .nullish(),
    conversation_id: z
      .string()
      .uuid("conversation_id must be a valid UUID.")
      .nullish(),
    ...offerTerms,
  })
  .superRefine((value, ctx) => {
    if (!value.listing_id && !value.buyer_request_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["listing_id"],
        message: "Provide either listing_id or buyer_request_id.",
      });
    }
    if (value.delivery_date && value.delivery_date < todayIsoDate()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delivery_date"],
        message: "delivery_date cannot be in the past.",
      });
    }
    if (value.expires_at && value.expires_at.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "expires_at must be in the future.",
      });
    }
  });

export const CounterOfferSchema = z
  .object({
    ...offerTerms,
  })
  .superRefine((value, ctx) => {
    if (value.delivery_date && value.delivery_date < todayIsoDate()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delivery_date"],
        message: "delivery_date cannot be in the past.",
      });
    }
    if (value.expires_at && value.expires_at.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "expires_at must be in the future.",
      });
    }
  });

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const ListOffersQuerySchema = z
  .object({
    ...paginationFields,
    status: z
      .enum([
        "pending",
        "countered",
        "accepted",
        "rejected",
        "withdrawn",
        "expired",
      ])
      .optional(),
    role: z.enum(["buyer", "farmer"]).optional(),
    direction: z.enum(["sent", "received"]).optional(),
    listing_id: z.string().uuid("listing_id must be a valid UUID.").optional(),
    buyer_request_id: z
      .string()
      .uuid("buyer_request_id must be a valid UUID.")
      .optional(),
    conversation_id: z
      .string()
      .uuid("conversation_id must be a valid UUID.")
      .optional(),
    sort: z.enum(["newest", "expiring_soon"]).default("newest"),
  })
  .refine(
    (value) =>
      value.sort !== "expiring_soon" || value.status === "pending",
    {
      message: "sort=expiring_soon can only be used with status=pending.",
      path: ["sort"],
    },
  );

export const OfferIdSchema = z.string().uuid("Invalid offer ID.");

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type CounterOfferInput = z.infer<typeof CounterOfferSchema>;
export type ListOffersQuery = z.infer<typeof ListOffersQuerySchema>;
