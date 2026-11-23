import type { OfferTermsPayload } from "@/lib/api";

export const OFFER_UNITS = [
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

export interface OfferFormValues {
  quantity: string;
  unit: string;
  unit_price: string;
  currency: string;
  delivery_terms: string;
  delivery_location: string;
  delivery_date: string;
  buyer_message: string;
  expires_at: string;
}

export const EMPTY_OFFER_FORM: OfferFormValues = {
  quantity: "",
  unit: "kg",
  unit_price: "",
  currency: "NGN",
  delivery_terms: "",
  delivery_location: "",
  delivery_date: "",
  buyer_message: "",
  expires_at: "",
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseExpiry(value: string): Date | null {
  if (!value) return null;
  const normalized = DATE_ONLY.test(value)
    ? `${value}T23:59:59.999Z`
    : value.length === 16
      ? `${value}:00`
      : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateOfferForm(form: OfferFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const quantity = Number(form.quantity);
  const unitPrice = Number(form.unit_price);

  if (!form.quantity || !Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = "Quantity must be a positive number.";
  }
  if (!form.unit.trim()) errors.unit = "Unit is required.";
  else if (form.unit.trim().length > 50) errors.unit = "Unit is too long.";
  if (!form.unit_price || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    errors.unit_price = "Unit price must be a positive number.";
  }
  if (form.currency.trim() && !/^[A-Za-z]{3}$/.test(form.currency.trim())) {
    errors.currency = "Currency must be a 3-letter code.";
  }
  if (form.delivery_terms.trim().length > 2000) {
    errors.delivery_terms = "Delivery terms must be 2000 characters or fewer.";
  }
  if (form.delivery_location.trim().length > 500) {
    errors.delivery_location = "Delivery location must be 500 characters or fewer.";
  }
  if (form.buyer_message.trim().length > 2000) {
    errors.buyer_message = "Message must be 2000 characters or fewer.";
  }
  if (form.delivery_date) {
    if (!DATE_ONLY.test(form.delivery_date)) {
      errors.delivery_date = "Use a valid delivery date.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const delivery = new Date(`${form.delivery_date}T00:00:00`);
      if (delivery < today) errors.delivery_date = "Delivery date cannot be in the past.";
    }
  }

  if (form.expires_at) {
    const expiry = parseExpiry(form.expires_at);
    if (!expiry) errors.expires_at = "Use a valid expiry date.";
    else if (expiry.getTime() <= Date.now()) errors.expires_at = "Expiry must be in the future.";
  }

  return errors;
}

export function offerFormToPayload(form: OfferFormValues): OfferTermsPayload {
  const optional = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  const expiry = parseExpiry(form.expires_at);

  return {
    quantity: Number(form.quantity),
    unit: form.unit.trim(),
    unit_price: Number(form.unit_price),
    currency: form.currency.trim().toUpperCase() || undefined,
    delivery_terms: optional(form.delivery_terms),
    delivery_location: optional(form.delivery_location),
    delivery_date: form.delivery_date || null,
    buyer_message: optional(form.buyer_message),
    ...(expiry ? { expires_at: expiry.toISOString() } : {}),
  };
}
