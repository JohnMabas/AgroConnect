import { describe, expect, it } from "vitest";
import {
  EMPTY_OFFER_FORM,
  offerFormToPayload,
  validateOfferForm,
  type OfferFormValues,
} from "./offer-form";

function validForm(overrides: Partial<OfferFormValues> = {}): OfferFormValues {
  return {
    ...EMPTY_OFFER_FORM,
    quantity: "10",
    unit: "kg",
    unit_price: "250",
    ...overrides,
  };
}

describe("validateOfferForm", () => {
  it("accepts valid offer terms", () => {
    expect(validateOfferForm(validForm())).toEqual({});
  });

  it("rejects non-positive quantity and price", () => {
    const errors = validateOfferForm(validForm({ quantity: "0", unit_price: "-1" }));
    expect(errors.quantity).toBeTruthy();
    expect(errors.unit_price).toBeTruthy();
  });

  it("rejects invalid currency codes", () => {
    const errors = validateOfferForm(validForm({ currency: "NAIRA" }));
    expect(errors.currency).toBeTruthy();
  });

  it("rejects past expiry dates", () => {
    const errors = validateOfferForm(validForm({ expires_at: "2020-01-01" }));
    expect(errors.expires_at).toBeTruthy();
  });
});

describe("offerFormToPayload", () => {
  it("converts numeric fields and omits empty optionals", () => {
    expect(offerFormToPayload(validForm())).toEqual({
      quantity: 10,
      unit: "kg",
      unit_price: 250,
      currency: "NGN",
      delivery_terms: null,
      delivery_location: null,
      delivery_date: null,
      buyer_message: null,
    });
  });

  it("normalizes expiry to an ISO timestamp", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const payload = offerFormToPayload(validForm({ expires_at: future }));
    expect(payload.expires_at).toMatch(/T.*Z$/);
  });
});
