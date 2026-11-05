import { describe, expect, it } from "vitest";
import type { ListingData } from "@/lib/api";
import {
  EMPTY_LISTING_FORM,
  MAX_IMAGE_SIZE_BYTES,
  isImageWithinSizeLimit,
  isSupportedImageType,
  listingFormToPayload,
  listingToFormValues,
  validateListingForm,
  type ListingFormValues,
} from "@/lib/listing-form";

function makeListing(overrides: Partial<ListingData> = {}): ListingData {
  return {
    id: "listing-1",
    farmer_user_id: "farmer-1",
    produce_type_id: "type-1",
    title: "Fresh tomatoes",
    description: "Vine ripened",
    variety: "Roma",
    grade: "A",
    quantity: 100,
    available_quantity: 100,
    reserved_quantity: 0,
    sold_quantity: 0,
    unit: "kg",
    packaging_description: "Baskets",
    price_per_unit: 1200,
    currency: "NGN",
    country: "Nigeria",
    state_or_region: "Kaduna",
    status: "draft",
    is_available: true,
    harvest_date: "2026-11-01",
    available_from: "2026-11-02",
    expiry_date: null,
    local_government_area: "Zaria",
    community: "Sabon Gari",
    collection_location: "Main market",
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

function validForm(
  overrides: Partial<ListingFormValues> = {},
): ListingFormValues {
  return {
    ...EMPTY_LISTING_FORM,
    produce_type_id: "type-1",
    title: "Fresh tomatoes",
    quantity: "100",
    price_per_unit: "1200",
    ...overrides,
  };
}

describe("listingToFormValues", () => {
  it("converts a listing into editable strings and keeps optional values", () => {
    const form = listingToFormValues(makeListing());

    expect(form.produce_type_id).toBe("");
    expect(form.title).toBe("Fresh tomatoes");
    expect(form.quantity).toBe("100");
    expect(form.price_per_unit).toBe("1200");
    expect(form.harvest_date).toBe("2026-11-01");
    expect(form.expiry_date).toBe("");
  });

  it("turns null optional fields into empty strings", () => {
    const form = listingToFormValues(
      makeListing({ description: null, variety: null, grade: null }),
    );

    expect(form.description).toBe("");
    expect(form.variety).toBe("");
    expect(form.grade).toBe("");
  });
});

describe("listingFormToPayload", () => {
  it("trims the title, converts numbers and clears empty optional fields", () => {
    const payload = listingFormToPayload(
      validForm({ title: "  Fresh tomatoes  ", description: "  " }),
    );

    expect(payload.title).toBe("Fresh tomatoes");
    expect(payload.description).toBeNull();
    expect(payload.quantity).toBe(100);
    expect(payload.price_per_unit).toBe(1200);
    expect(payload.produce_type_id).toBe("type-1");
  });

  it("omits produce_type_id when it is not set", () => {
    const payload = listingFormToPayload(validForm({ produce_type_id: "" }));

    expect(payload).not.toHaveProperty("produce_type_id");
  });
});

describe("validateListingForm", () => {
  it("accepts a complete form", () => {
    expect(validateListingForm(validForm())).toEqual({});
  });

  it("requires a produce type when creating a listing", () => {
    const errors = validateListingForm(
      validForm({ produce_type_id: "" }),
    );

    expect(errors.produce_type_id).toBeTruthy();
  });

  it("allows a missing produce type when editing", () => {
    const errors = validateListingForm(validForm({ produce_type_id: "" }), {
      requireProduceType: false,
    });

    expect(errors.produce_type_id).toBeUndefined();
  });

  it("rejects short titles, non-positive quantities and negative prices", () => {
    const errors = validateListingForm(
      validForm({ title: "ab", quantity: "0", price_per_unit: "-1" }),
    );

    expect(errors.title).toBeTruthy();
    expect(errors.quantity).toBeTruthy();
    expect(errors.price_per_unit).toBeTruthy();
  });

  it("rejects non-numeric quantity and price values", () => {
    const errors = validateListingForm(
      validForm({ quantity: "many", price_per_unit: "free" }),
    );

    expect(errors.quantity).toBeTruthy();
    expect(errors.price_per_unit).toBeTruthy();
  });

  it("requires a three-letter currency code and a unit", () => {
    const errors = validateListingForm(
      validForm({ currency: "NAIRA", unit: "" }),
    );

    expect(errors.currency).toBeTruthy();
    expect(errors.unit).toBeTruthy();
  });
});

describe("image helpers", () => {
  it("accepts JPEG, PNG and WebP uploads", () => {
    expect(isSupportedImageType("image/jpeg")).toBe(true);
    expect(isSupportedImageType("image/png")).toBe(true);
    expect(isSupportedImageType("image/webp")).toBe(true);
  });

  it("rejects unsupported image types", () => {
    expect(isSupportedImageType("image/gif")).toBe(false);
    expect(isSupportedImageType("application/pdf")).toBe(false);
  });

  it("enforces the 5 MiB size limit", () => {
    expect(isImageWithinSizeLimit(MAX_IMAGE_SIZE_BYTES)).toBe(true);
    expect(isImageWithinSizeLimit(MAX_IMAGE_SIZE_BYTES + 1)).toBe(false);
  });
});
