import { normalizeDecimal } from "../modules/listings/decimal.js";

const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = {
  NGN: 2,
  GHS: 2,
  ZAR: 2,
  USD: 2,
};

export function currencyExponent(currency: string): number | undefined {
  return CURRENCY_EXPONENTS[currency.toUpperCase()];
}

export function toMinorUnits(
  amount: number | string,
  currency: string,
): number {
  const exponent = currencyExponent(currency);
  if (exponent === undefined) {
    throw Object.assign(
      new Error(`Unsupported currency: ${currency}.`),
      { code: "INVALID_CURRENCY" },
    );
  }

  const normalized = normalizeDecimal(amount, exponent);
  if (normalized.startsWith("-")) {
    throw Object.assign(
      new Error("Amount cannot be negative."),
      { code: "INVALID_AMOUNT" },
    );
  }

  const [whole = "0", fraction = ""] = normalized.split(".");
  const minor = BigInt(whole) * 10n ** BigInt(exponent) + BigInt(fraction || "0");
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw Object.assign(
      new Error("Amount is too large."),
      { code: "INVALID_AMOUNT" },
    );
  }
  return Number(minor);
}

export function fromMinorUnits(
  minor: number | string,
  currency: string,
): number {
  const exponent = currencyExponent(currency);
  if (exponent === undefined) {
    throw Object.assign(
      new Error(`Unsupported currency: ${currency}.`),
      { code: "INVALID_CURRENCY" },
    );
  }

  const value = BigInt(minor);
  const divisor = 10n ** BigInt(exponent);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(exponent, "0");
  return Number(`${whole.toString()}.${fraction}`);
}
