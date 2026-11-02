import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { ValidationError } from "sequelize";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "") {
    return null;
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    throw new ValidationError(
      "Email address is invalid. Provide a valid email address such as name@example.com.",
      [],
    );
  }

  return normalized;
}

export function normalizePhoneNumber(
  value: string | null | undefined,
  defaultCountry: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  try {
    const parsed = parsePhoneNumberFromString(
      trimmed,
      defaultCountry as CountryCode,
    );

    if (parsed === undefined || !parsed.isValid()) {
      throw new ValidationError(
        "Phone number is invalid. Provide a valid international phone number such as +2348031234567.",
        [],
      );
    }

    return parsed.number;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ValidationError(
      "Phone number is invalid. Provide a valid international phone number such as +2348031234567.",
      [],
    );
  }
}
