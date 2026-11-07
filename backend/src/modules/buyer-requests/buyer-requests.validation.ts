import { z } from "zod";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");

const BuyerRequestFieldsSchema = z.object({
  produce_type_id: z
    .string()
    .uuid("produce_type_id must be a valid UUID.")
    .nullish(),
  produce_category_id: z
    .string()
    .uuid("produce_category_id must be a valid UUID.")
    .nullish(),
  requested_quantity: z
    .number()
    .finite("Requested quantity must be a finite number.")
    .positive("Requested quantity must be greater than zero."),
  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(50, "Unit must be at most 50 characters."),
  preferred_location: z
    .string()
    .trim()
    .max(500, "Preferred location must be at most 500 characters.")
    .nullish(),
  country: z
    .string()
    .trim()
    .max(100, "Country must be at most 100 characters.")
    .nullish(),
  state_or_region: z
    .string()
    .trim()
    .max(150, "State or region must be at most 150 characters.")
    .nullish(),
  local_government_area: z
    .string()
    .trim()
    .max(150, "Local government area must be at most 150 characters.")
    .nullish(),
  community: z
    .string()
    .trim()
    .max(150, "Community must be at most 150 characters.")
    .nullish(),
  target_price_per_unit: z
    .number()
    .finite("Target price must be a finite number.")
    .nonnegative("Target price cannot be negative.")
    .nullish(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO currency code.")
    .optional(),
  additional_requirements: z
    .string()
    .trim()
    .max(2000, "Additional requirements must be at most 2000 characters.")
    .nullish(),
  required_delivery_date: dateOnly.nullish(),
  expiry_date: dateOnly,
});

export const CreateBuyerRequestSchema = BuyerRequestFieldsSchema.extend({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO currency code.")
    .default("NGN"),
}).superRefine(
  (value, ctx) => {
    if (!value.produce_type_id && !value.produce_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["produce_type_id"],
        message: "Provide either produce_type_id or produce_category_id.",
      });
    }

    const today = todayIsoDate();
    if (value.expiry_date < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiry_date"],
        message: "expiry_date cannot be in the past.",
      });
    }
    if (value.required_delivery_date && value.required_delivery_date < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["required_delivery_date"],
        message: "required_delivery_date cannot be in the past.",
      });
    }
  },
);

export const UpdateBuyerRequestSchema = BuyerRequestFieldsSchema.partial().superRefine(
  (value, ctx) => {
    const today = todayIsoDate();
    if (value.expiry_date && value.expiry_date < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiry_date"],
        message: "expiry_date cannot be in the past.",
      });
    }
    if (value.required_delivery_date && value.required_delivery_date < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["required_delivery_date"],
        message: "required_delivery_date cannot be in the past.",
      });
    }
  },
);

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const ListBuyerRequestsQuerySchema = z
  .object({
    ...paginationFields,
    search: z
      .string()
      .trim()
      .max(100, "Search must be at most 100 characters.")
      .optional(),
    category_slug: z.string().trim().max(150).optional(),
    produce_type_id: z
      .string()
      .uuid("produce_type_id must be a valid UUID.")
      .optional(),
    location: z
      .string()
      .trim()
      .max(150, "Location must be at most 150 characters.")
      .optional(),
    min_quantity: z.coerce.number().finite().positive().optional(),
    max_quantity: z.coerce.number().finite().positive().optional(),
    min_target_price: z.coerce.number().finite().nonnegative().optional(),
    max_target_price: z.coerce.number().finite().nonnegative().optional(),
    required_delivery_after: dateOnly.optional(),
    required_delivery_before: dateOnly.optional(),
    sort: z.enum(["newest", "delivery_soonest"]).default("newest"),
  })
  .refine(
    (value) =>
      value.min_quantity === undefined ||
      value.max_quantity === undefined ||
      value.min_quantity <= value.max_quantity,
    {
      message: "min_quantity cannot be greater than max_quantity.",
      path: ["min_quantity"],
    },
  )
  .refine(
    (value) =>
      value.min_target_price === undefined ||
      value.max_target_price === undefined ||
      value.min_target_price <= value.max_target_price,
    {
      message: "min_target_price cannot be greater than max_target_price.",
      path: ["min_target_price"],
    },
  )
  .refine(
    (value) =>
      value.required_delivery_after === undefined ||
      value.required_delivery_before === undefined ||
      value.required_delivery_after <= value.required_delivery_before,
    {
      message:
        "required_delivery_after cannot be later than required_delivery_before.",
      path: ["required_delivery_after"],
    },
  );

export const ListMyBuyerRequestsQuerySchema = z.object({
  ...paginationFields,
  status: z
    .enum(["open", "paused", "fulfilled", "cancelled", "expired"])
    .optional(),
});

export const BuyerRequestIdSchema = z.string().uuid("Invalid buyer request ID.");

export type CreateBuyerRequestInput = z.infer<typeof CreateBuyerRequestSchema>;
export type UpdateBuyerRequestInput = z.infer<typeof UpdateBuyerRequestSchema>;
export type ListBuyerRequestsQuery = z.infer<
  typeof ListBuyerRequestsQuerySchema
>;
export type ListMyBuyerRequestsQuery = z.infer<
  typeof ListMyBuyerRequestsQuerySchema
>;
