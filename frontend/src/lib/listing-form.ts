import type { ListingData } from "@/lib/api";

export const LISTING_UNITS = [
  "kg",
  "g",
  "tonne",
  "bag",
  "crate",
  "basket",
  "piece",
  "litre",
  "bunch",
] as const;

export const MAX_IMAGES_PER_LISTING = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export interface ListingFormValues {
  produce_type_id: string;
  title: string;
  description: string;
  variety: string;
  grade: string;
  quantity: string;
  unit: string;
  packaging_description: string;
  price_per_unit: string;
  currency: string;
  country: string;
  state_or_region: string;
  local_government_area: string;
  community: string;
  collection_location: string;
  harvest_date: string;
  available_from: string;
  expiry_date: string;
}

export const EMPTY_LISTING_FORM: ListingFormValues = {
  produce_type_id: "",
  title: "",
  description: "",
  variety: "",
  grade: "",
  quantity: "",
  unit: "kg",
  packaging_description: "",
  price_per_unit: "",
  currency: "NGN",
  country: "Nigeria",
  state_or_region: "",
  local_government_area: "",
  community: "",
  collection_location: "",
  harvest_date: "",
  available_from: "",
  expiry_date: "",
};

type EditableListing = Pick<
  ListingData,
  | "title"
  | "description"
  | "variety"
  | "grade"
  | "quantity"
  | "unit"
  | "packaging_description"
  | "price_per_unit"
  | "currency"
  | "country"
  | "state_or_region"
  | "local_government_area"
  | "community"
  | "collection_location"
  | "harvest_date"
  | "available_from"
  | "expiry_date"
>;

/**
 * Convert a listing returned by the API into editable form values.
 * Produce type is intentionally not editable on the edit screen.
 */
export function listingToFormValues(
  listing: EditableListing,
): ListingFormValues {
  return {
    ...EMPTY_LISTING_FORM,
    title: listing.title,
    description: listing.description ?? "",
    variety: listing.variety ?? "",
    grade: listing.grade ?? "",
    quantity: String(listing.quantity),
    unit: listing.unit,
    packaging_description: listing.packaging_description ?? "",
    price_per_unit: String(listing.price_per_unit),
    currency: listing.currency,
    country: listing.country ?? "",
    state_or_region: listing.state_or_region ?? "",
    local_government_area: listing.local_government_area ?? "",
    community: listing.community ?? "",
    collection_location: listing.collection_location ?? "",
    harvest_date: listing.harvest_date ?? "",
    available_from: listing.available_from ?? "",
    expiry_date: listing.expiry_date ?? "",
  };
}

/**
 * Convert form values into the JSON payload accepted by the API.
 * Empty optional strings become null so they clear existing values.
 */
export function listingFormToPayload(form: ListingFormValues) {
  const optional = (value: string) => value.trim() || null;
  const produceTypeId = form.produce_type_id.trim();

  return {
    ...(produceTypeId ? { produce_type_id: produceTypeId } : {}),
    title: form.title.trim(),
    description: optional(form.description),
    variety: optional(form.variety),
    grade: optional(form.grade),
    quantity: form.quantity !== "" ? Number(form.quantity) : undefined,
    unit: form.unit,
    packaging_description: optional(form.packaging_description),
    price_per_unit:
      form.price_per_unit !== "" ? Number(form.price_per_unit) : undefined,
    currency: form.currency,
    country: optional(form.country),
    state_or_region: optional(form.state_or_region),
    local_government_area: optional(form.local_government_area),
    community: optional(form.community),
    collection_location: optional(form.collection_location),
    harvest_date: form.harvest_date || null,
    available_from: form.available_from || null,
    expiry_date: form.expiry_date || null,
  };
}

export interface ListingFormValidationOptions {
  /** Require a produce type selection (true when creating a listing). */
  requireProduceType?: boolean;
}

/**
 * Client-side validation. The backend re-validates every value; this exists to
 * give immediate, friendly feedback without losing entered information.
 */
export function validateListingForm(
  form: ListingFormValues,
  options: ListingFormValidationOptions = {},
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (options.requireProduceType !== false && !form.produce_type_id) {
    errors.produce_type_id = "Please select a produce type.";
  }

  if (form.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }

  const quantity = Number(form.quantity);
  if (form.quantity === "" || !Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = "Quantity must be a positive number.";
  }

  const price = Number(form.price_per_unit);
  if (
    form.price_per_unit === "" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    errors.price_per_unit = "Price must be 0 or greater.";
  }

  if (!form.unit) {
    errors.unit = "Please select a unit.";
  }

  if (!/^[A-Za-z]{3}$/.test(form.currency)) {
    errors.currency = "Currency must be a 3-letter code.";
  }

  return errors;
}

export function isSupportedImageType(mimeType: string): boolean {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function isImageWithinSizeLimit(sizeInBytes: number): boolean {
  return sizeInBytes <= MAX_IMAGE_SIZE_BYTES;
}
