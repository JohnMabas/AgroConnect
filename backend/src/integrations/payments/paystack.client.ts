import { env } from "../../config/env.js";
import type {
  PaystackInitializeData,
  PaystackRefundData,
  PaystackResponse,
  PaystackTransactionData,
} from "./paystack.types.js";

export class PaystackError extends Error {
  readonly code: string;
  readonly statusCode: number | undefined;

  constructor(
    message: string,
    code = "PAYSTACK_ERROR",
    statusCode?: number,
  ) {
    super(message);
    this.name = "PaystackError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requireSecretKey(): string {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new PaystackError(
      "Paystack is not configured. Set PAYSTACK_SECRET_KEY on the server.",
      "PAYSTACK_NOT_CONFIGURED",
    );
  }
  return env.PAYSTACK_SECRET_KEY;
}

function buildUrl(path: string): string {
  return `${env.PAYSTACK_BASE_URL.replace(/\/+$/, "")}${path}`;
}

async function request<T>(
  path: string,
  options: {
    method: "GET" | "POST";
    body?: Record<string, unknown>;
  },
): Promise<PaystackResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env.PAYSTACK_REQUEST_TIMEOUT_MS,
  );
  timeout.unref?.();

  try {
    const response = await globalThis.fetch(buildUrl(path), {
      method: options.method,
      headers: {
        Authorization: `Bearer ${requireSecretKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text === "" ? null : JSON.parse(text);
    } catch {
      throw new PaystackError(
        "Paystack returned an unreadable response.",
        "PAYSTACK_INVALID_RESPONSE",
        response.status,
      );
    }

    if (!response.ok) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "message" in parsed &&
        typeof (parsed as { message?: unknown }).message === "string"
          ? (parsed as { message: string }).message
          : `Paystack request failed with HTTP ${response.status}.`;
      throw new PaystackError(message, "PAYSTACK_REQUEST_FAILED", response.status);
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("status" in parsed) ||
      (parsed as { status?: unknown }).status !== true
    ) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "message" in parsed &&
        typeof (parsed as { message?: unknown }).message === "string"
          ? (parsed as { message: string }).message
          : "Paystack request was not successful.";
      throw new PaystackError(message, "PAYSTACK_REQUEST_FAILED", response.status);
    }

    return parsed as PaystackResponse<T>;
  } catch (error) {
    if (error instanceof PaystackError) {
      throw error;
    }
    if ((error as Error).name === "AbortError") {
      throw new PaystackError(
        "Paystack request timed out.",
        "PAYSTACK_TIMEOUT",
      );
    }
    throw new PaystackError(
      "Could not reach Paystack.",
      "PAYSTACK_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function isPaystackConfigured(): boolean {
  return Boolean(env.PAYSTACK_SECRET_KEY);
}

export async function initializeTransaction(input: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeData> {
  const response = await request<PaystackInitializeData>(
    "/transaction/initialize",
    {
      method: "POST",
      body: {
        email: input.email,
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        ...(input.callback_url
          ? { callback_url: input.callback_url }
          : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    },
  );
  return response.data;
}

export async function verifyTransaction(
  reference: string,
): Promise<PaystackTransactionData> {
  const response = await request<PaystackTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
  return response.data;
}

export async function createRefund(input: {
  transaction: string;
  amount?: number;
  currency: string;
  customer_note?: string;
  merchant_note?: string;
}): Promise<PaystackRefundData> {
  const response = await request<PaystackRefundData>("/refund", {
    method: "POST",
    body: {
      transaction: input.transaction,
      currency: input.currency,
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.customer_note
        ? { customer_note: input.customer_note }
        : {}),
      ...(input.merchant_note
        ? { merchant_note: input.merchant_note }
        : {}),
    },
  });
  return response.data;
}

export async function fetchRefund(
  refundId: string | number,
): Promise<PaystackRefundData> {
  const response = await request<PaystackRefundData>(
    `/refund/${encodeURIComponent(String(refundId))}`,
    { method: "GET" },
  );
  return response.data;
}
