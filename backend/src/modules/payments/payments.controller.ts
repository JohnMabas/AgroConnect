import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  InitializePaymentSchema,
  PaymentReferenceSchema,
  RefundRequestSchema,
} from "../orders/orders.validation.js";
import {
  getRefundsForPayment,
  handlePaystackWebhook,
  initializePayment,
  requestRefund,
  verifyPayment,
} from "./payments.service.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
}

function requireAuth(req: Request, res: Response): boolean {
  if (!req.user) {
    res
      .status(401)
      .json({ success: false, error: { message: "Authentication required." } });
    return false;
  }
  return true;
}

function parseReference(req: Request, res: Response): string | undefined {
  const parsed = PaymentReferenceSchema.safeParse(req.params["reference"]);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: zodErrorToFields(parsed.error),
    });
    return undefined;
  }
  return parsed.data;
}

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const error = err as Error & {
    code?: string;
    status?: number;
    statusCode?: number;
  };
  const status = error.status ?? error.statusCode;

  if (status && status >= 400 && status < 500) {
    res.status(status).json({
      success: false,
      error: { message: error.message, code: error.code },
    });
    return;
  }

  switch (error.code) {
    case "NOT_FOUND":
      res
        .status(404)
        .json({ success: false, error: { message: error.message } });
      return;
    case "FORBIDDEN":
      res
        .status(403)
        .json({ success: false, error: { message: error.message } });
      return;
    case "INVALID_OPERATION":
      res
        .status(422)
        .json({ success: false, error: { message: error.message } });
      return;
    case "CONFLICT":
      res
        .status(409)
        .json({ success: false, error: { message: error.message } });
      return;
    default:
      if (
        error.code?.startsWith("PAYSTACK") ||
        error.code?.startsWith("PAYMENT_")
      ) {
        res.status(status ?? 502).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
        return;
      }
      next(err);
  }
}

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function initializePaymentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = InitializePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await initializePayment(req.user!.sub, parsed.data);
    res.status(201).json({
      success: true,
      message: "Payment initialized.",
      data: result,
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function verifyPaymentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const reference = parseReference(req, res);
    if (!reference) return;

    const result = await verifyPayment(req.user!.sub, reference);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function paystackWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === "string" ? req.body : JSON.stringify(req.body),
        );

    const result = await handlePaystackWebhook(rawBody, {
      signatureHeader: headerValue(req, "paystack-signature"),
      legacySignatureHeader: headerValue(req, "x-paystack-signature"),
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function requestRefundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const reference = parseReference(req, res);
    if (!reference) return;

    const parsed = RefundRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await requestRefund(
      req.user!.sub,
      reference,
      parsed.data,
    );
    res.status(201).json({
      success: true,
      message: "Refund requested.",
      data: result,
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getRefundsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const reference = parseReference(req, res);
    if (!reference) return;

    const result = await getRefundsForPayment(req.user!.sub, reference);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
