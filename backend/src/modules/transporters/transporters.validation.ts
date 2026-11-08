import { z } from "zod";

const uuid = z.string().uuid();

const availabilityStatus = z.enum(["available", "unavailable"]);

const coverageArea = z
  .string()
  .trim()
  .min(1, "A coverage area cannot be empty.")
  .max(150, "Each coverage area must be at most 150 characters.");

const produceType = z
  .string()
  .trim()
  .min(1, "A produce type cannot be empty.")
  .max(100, "Each produce type must be at most 100 characters.");

export const CreateTransporterProfileSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters.")
    .max(200, "Business name must be at most 200 characters."),
  contact_phone: z
    .string()
    .trim()
    .min(5, "Contact phone must be at least 5 characters.")
    .max(32, "Contact phone must be at most 32 characters."),
  operating_location: z
    .string()
    .trim()
    .min(2, "Operating location must be at least 2 characters.")
    .max(500, "Operating location must be at most 500 characters."),
  coverage_areas: z
    .array(coverageArea)
    .min(1, "At least one coverage area is required.")
    .max(50, "At most 50 coverage areas are allowed."),
  vehicle_type: z.string().trim().max(100).optional(),
  vehicle_registration_number: z.string().trim().max(50).optional(),
  vehicle_capacity: z.string().trim().max(100).optional(),
  produce_types: z.array(produceType).max(50).optional(),
  availability_status: availabilityStatus.optional(),
});

export const UpdateTransporterProfileSchema = z
  .object({
    business_name: z.string().trim().min(2).max(200).optional(),
    contact_phone: z.string().trim().min(5).max(32).optional(),
    operating_location: z.string().trim().min(2).max(500).optional(),
    coverage_areas: z.array(coverageArea).min(1).max(50).optional(),
    vehicle_type: z.string().trim().max(100).nullish(),
    vehicle_registration_number: z.string().trim().max(50).nullish(),
    vehicle_capacity: z.string().trim().max(100).nullish(),
    produce_types: z.array(produceType).max(50).optional(),
    availability_status: availabilityStatus.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const ListAvailableTransportersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  location: z.string().trim().max(500).optional(),
});

export const TransportSuspendSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000, "Suspension reason must be at most 1000 characters.")
    .optional(),
});

export const TransporterIdSchema = uuid;

export type CreateTransporterProfileInput = z.infer<
  typeof CreateTransporterProfileSchema
>;
export type UpdateTransporterProfileInput = z.infer<
  typeof UpdateTransporterProfileSchema
>;
export type ListAvailableTransportersQuery = z.infer<
  typeof ListAvailableTransportersQuerySchema
>;
export type TransportSuspendInput = z.infer<typeof TransportSuspendSchema>;
