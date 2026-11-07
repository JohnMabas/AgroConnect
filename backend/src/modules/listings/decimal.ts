/**
 * Small fixed-point decimal helpers used for inventory quantities.
 *
 * JavaScript numbers are binary floating-point values and must not be used for
 * arithmetic that feeds DECIMAL database columns. Quantities are parsed into
 * scaled BigInt values, arithmetic is performed exactly, and the result is
 * rendered as a fixed-scale string for PostgreSQL.
 */

function toScaled(value: number | string | null | undefined, scale: number): bigint {
  if (value === null || value === undefined || value === "") {
    throw new Error("A decimal value is required.");
  }

  let text = typeof value === "number" ? String(value) : value.trim();

  if (text.includes("e") || text.includes("E")) {
    const numeric = Number(text);
    if (!Number.isFinite(numeric)) {
      throw new Error("Invalid decimal value.");
    }
    text = numeric.toFixed(scale);
  }

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    throw new Error("Invalid decimal value.");
  }

  const sign = match[1] === "-" ? -1n : 1n;
  const whole = match[2] ?? "0";
  const fraction = (match[3] ?? "").padEnd(scale, "0").slice(0, scale);
  return sign * (BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction || "0"));
}

function fromScaled(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** BigInt(scale);
  const whole = absolute / divisor;
  const fraction = (absolute % divisor)
    .toString()
    .padStart(scale, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

/** Format a value as a fixed-scale decimal string suitable for PostgreSQL. */
export function normalizeDecimal(
  value: number | string | null | undefined,
  scale: number,
): string {
  return fromScaled(toScaled(value, scale), scale);
}

export function addDecimal(
  left: number | string,
  right: number | string,
  scale: number,
): string {
  return fromScaled(toScaled(left, scale) + toScaled(right, scale), scale);
}

export function subtractDecimal(
  left: number | string,
  right: number | string,
  scale: number,
): string {
  return fromScaled(toScaled(left, scale) - toScaled(right, scale), scale);
}

/**
 * Multiply two fixed-point decimals and round half-up to the result scale.
 */
export function multiplyDecimal(
  left: number | string,
  leftScale: number,
  right: number | string,
  rightScale: number,
  resultScale: number,
): string {
  const product = toScaled(left, leftScale) * toScaled(right, rightScale);
  const productScale = leftScale + rightScale;

  if (productScale === resultScale) {
    return fromScaled(product, resultScale);
  }

  if (productScale > resultScale) {
    const divisor = 10n ** BigInt(productScale - resultScale);
    const rounded = (product + divisor / 2n) / divisor;
    return fromScaled(rounded, resultScale);
  }

  return fromScaled(product * 10n ** BigInt(resultScale - productScale), resultScale);
}

/**
 * Compare two fixed-point decimals. Returns -1, 0 or 1.
 */
export function compareDecimal(
  left: number | string,
  right: number | string,
  scale: number,
): number {
  const leftValue = toScaled(left, scale);
  const rightValue = toScaled(right, scale);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}
