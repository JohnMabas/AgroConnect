import { z } from "zod";

export const CreateListingSchema = z.object({
  produce_type_id: z.string().uuid("produce_type_id must be a valid UUID."),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(300, "Title must be at most 300 characters."),
  description: z.string().trim().nullish(),
  variety: z.string().trim().max(150, "Variety must be at most 150 characters.").nullish(),
  grade: z.string().trim().max(100, "Grade must be at most 100 characters.").nullish(),
  quantity: z
    .number()
    .finite("Quantity must be a finite number.")
    .positive("Quantity must be greater than zero."),
  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(50, "Unit must be at most 50 characters."),
  packaging_description: z
    .string()
    .trim()
    .max(200, "Packaging description must be at most 200 characters.")
    .nullish(),
  price_per_unit: z
    .number()
    .finite("Price must be a finite number.")
    .nonnegative("Price cannot be negative."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO currency code.")
    .default("NGN"),
  country: z.string().trim().max(100, "Country must be at most 100 characters.").nullish(),
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
  collection_location: z.string().trim().nullish(),
  harvest_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "harvest_date must be in YYYY-MM-DD format.")
    .nullish(),
  available_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "available_from must be in YYYY-MM-DD format.")
    .nullish(),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expiry_date must be in YYYY-MM-DD format.")
    .nullish(),
});

export const UpdateListingSchema = CreateListingSchema.partial();

export const AdjustmentSchema = z.object({
  adjustment_type: z.enum(["stock_added", "stock_removed", "correction"], {
    required_error: "adjustment_type is required.",
    invalid_type_error:
      "adjustment_type must be one of: stock_added, stock_removed, correction.",
  }),
  quantity_change: z
    .number()
    .finite("quantity_change must be a finite number.")
    .nonnegative("quantity_change must be zero or greater."),
  reason: z.string().trim().max(1000, "Reason must be at most 1000 characters.").nullish(),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
export type AdjustmentInput = z.infer<typeof AdjustmentSchema>;

export const ListListingsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(100, "Search must be at most 100 characters.").optional(),
    category_slug: z.string().trim().max(150).optional(),
    produce_type_id: z.string().uuid("produce_type_id must be a valid UUID.").optional(),
    location: z.string().trim().max(150).optional(),
    min_price: z.coerce.number().finite().nonnegative().optional(),
    max_price: z.coerce.number().finite().nonnegative().optional(),
    min_quantity: z.coerce.number().finite().positive().optional(),
    max_quantity: z.coerce.number().finite().positive().optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO currency code.")
      .optional(),
    sort: z
      .enum(["newest", "price_asc", "price_desc", "quantity_asc", "quantity_desc"])
      .default("newest"),
  })
  .refine(
    (value) =>
      value.min_price === undefined ||
      value.max_price === undefined ||
      value.min_price <= value.max_price,
    { message: "min_price cannot be greater than max_price.", path: ["min_price"] },
  )
  .refine(
    (value) =>
      value.min_quantity === undefined ||
      value.max_quantity === undefined ||
      value.min_quantity <= value.max_quantity,
    {
      message: "min_quantity cannot be greater than max_quantity.",
      path: ["min_quantity"],
    },
  );

export type ListListingsQuery = z.infer<typeof ListListingsQuerySchema>;
