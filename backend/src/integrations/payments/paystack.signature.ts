import { createHmac, timingSafeEqual } from "node:crypto";

export type PaystackSignatureScheme = "timestamped" | "legacy";

export interface PaystackSignatureVerification {
  valid: boolean;
  scheme?: PaystackSignatureScheme;
  reason?: string;
}

interface TimestampedSignature {
  timestamp: number;
  signatures: string[];
}

function parseTimestampedSignature(
  header: string,
): TimestampedSignature | null {
  let timestamp: number | undefined;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      return null;
    }

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (key === "t") {
      if (timestamp !== undefined || !/^\d+$/.test(value)) {
        return null;
      }
      timestamp = Number(value);
      continue;
    }

    if (key === "v1") {
      const valueSeparator = value.indexOf(":");
      if (valueSeparator === -1) {
        return null;
      }
      const keyId = value.slice(0, valueSeparator);
      const signature = value.slice(valueSeparator + 1);
      if (!keyId.startsWith("whk_") || !/^[0-9a-f]{128}$/i.test(signature)) {
        return null;
      }
      signatures.push(signature);
    }
  }

  if (timestamp === undefined || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

function safeHexEqual(expected: string, actual: string): boolean {
  if (!/^[0-9a-f]{128}$/i.test(actual)) {
    return false;
  }
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function verifyPaystackWebhookSignature(input: {
  rawBody: Buffer;
  signatureHeader: string | undefined;
  legacySignatureHeader: string | undefined;
  webhookSigningSecret: string | undefined;
  secretKey: string | undefined;
  nowSeconds?: number;
}): PaystackSignatureVerification {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (input.signatureHeader && input.webhookSigningSecret) {
    const parsed = parseTimestampedSignature(input.signatureHeader);
    if (!parsed) {
      return { valid: false, reason: "malformed_signature_header" };
    }

    if (Math.abs(now - parsed.timestamp) > 300) {
      return { valid: false, reason: "timestamp_out_of_tolerance" };
    }

    const signedPayload = Buffer.concat([
      Buffer.from(`${parsed.timestamp}.`),
      input.rawBody,
    ]);
    const expected = createHmac("sha512", input.webhookSigningSecret)
      .update(signedPayload)
      .digest("hex");

    if (parsed.signatures.some((signature) => safeHexEqual(expected, signature))) {
      return { valid: true, scheme: "timestamped" };
    }

    return { valid: false, reason: "invalid_signature" };
  }

  if (input.legacySignatureHeader && input.secretKey) {
    const expected = createHmac("sha512", input.secretKey)
      .update(input.rawBody)
      .digest("hex");

    if (safeHexEqual(expected, input.legacySignatureHeader)) {
      return { valid: true, scheme: "legacy" };
    }

    return { valid: false, reason: "invalid_legacy_signature" };
  }

  return { valid: false, reason: "no_supported_signature" };
}
