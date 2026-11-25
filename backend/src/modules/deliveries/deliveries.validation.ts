import { z } from "zod";

const uuid = z.string().uuid();

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.");

const latitude = z.coerce.number().finite().min(-90).max(90);
const longitude = z.coerce.number().finite().min(-180).max(180);

export const deliveryStatus = z.enum([
  "pending",
  "assigned",
  "accepted",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "failed",
]);

export const CreateDeliverySchema = z
  .object({
    order_id: uuid,
    pickup_location: z
      .string()
      .trim()
      .min(2, "Pickup location must be at least 2 characters.")
      .max(500, "Pickup location must be at most 500 characters."),
    delivery_location: z
      .string()
      .trim()
      .min(2, "Delivery location must be at least 2 characters.")
      .max(500, "Delivery location must be at most 500 characters.")
      .optional(),
    pickup_latitude: latitude.optional(),
    pickup_longitude: longitude.optional(),
    delivery_latitude: latitude.optional(),
    delivery_longitude: longitude.optional(),
    produce_description: z
      .string()
      .trim()
      .max(1000, "Produce description must be at most 1000 characters.")
      .optional(),
    quantity: z.coerce.number().finite().positive().optional(),
    unit: z.string().trim().max(50).optional(),
    expected_pickup_date: isoDate,
    expected_delivery_date: isoDate,
    delivery_fee: z.coerce.number().finite().nonnegative(
      "Delivery fee cannot be negative.",
    ),
    currency: z.string().trim().length(3).optional(),
    additional_instructions: z
      .string()
      .trim()
      .max(2000, "Additional instructions must be at most 2000 characters.")
      .optional(),
  })
  .refine(
    (value) => value.expected_delivery_date >= value.expected_pickup_date,
    {
      message: "Expected delivery date cannot be before the pickup date.",
      path: ["expected_delivery_date"],
    },
  )
  .refine(
    (value) =>
      (value.pickup_latitude === undefined) ===
      (value.pickup_longitude === undefined),
    {
      message: "Pickup coordinates must include both latitude and longitude.",
      path: ["pickup_longitude"],
    },
  )
  .refine(
    (value) =>
      (value.delivery_latitude === undefined) ===
      (value.delivery_longitude === undefined),
    {
      message:
        "Delivery coordinates must include both latitude and longitude.",
      path: ["delivery_longitude"],
    },
  );

export const ListDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: deliveryStatus.optional(),
  order_id: uuid.optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

export const AssignTransporterSchema = z.object({
  transporter_id: uuid,
});

export const UpdateDeliveryStatusSchema = z
  .object({
    status: z.enum([
      "picked_up",
      "in_transit",
      "delivered",
      "completed",
      "cancelled",
      "failed",
    ]),
    reason: z
      .string()
      .trim()
      .max(2000, "Reason must be at most 2000 characters.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description must be at most 1000 characters.")
      .optional(),
    location: z
      .string()
      .trim()
      .max(500, "Location must be at most 500 characters.")
      .optional(),
  })
  .refine(
    (value) =>
      value.status !== "failed" ||
      (value.reason !== undefined && value.reason.length > 0),
    {
      message: "A failure reason is required when marking a delivery failed.",
      path: ["reason"],
    },
  );

export const UpdateDeliveryLocationSchema = z
  .object({
    latitude,
    longitude,
    accuracy_meters: z.coerce
      .number()
      .finite()
      .nonnegative("Accuracy cannot be negative.")
      .max(10000, "Accuracy must be at most 10000 meters.")
      .optional(),
    recorded_at: z.coerce.date().optional(),
  })
  .refine((value) => value.recorded_at === undefined || value.recorded_at.getTime() <= Date.now() + 5 * 60 * 1000, {
    message: "Recorded time cannot be in the future.",
    path: ["recorded_at"],
  });

export const DeclineDeliverySchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000, "Decline reason must be at most 1000 characters.")
    .optional(),
});

export const DeliveryIdSchema = uuid;

export type CreateDeliveryInput = z.infer<typeof CreateDeliverySchema>;
export type ListDeliveriesQuery = z.infer<typeof ListDeliveriesQuerySchema>;
export type AssignTransporterInput = z.infer<
  typeof AssignTransporterSchema
>;
export type UpdateDeliveryStatusInput = z.infer<
  typeof UpdateDeliveryStatusSchema
>;
export type UpdateDeliveryLocationInput = z.infer<
  typeof UpdateDeliveryLocationSchema
>;
export type DeclineDeliveryInput = z.infer<typeof DeclineDeliverySchema>;
