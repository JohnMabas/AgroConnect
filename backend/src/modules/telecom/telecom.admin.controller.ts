import type { NextFunction, Request, Response } from "express";
import { z, type ZodError } from "zod";
import {
  getTelecomConfigStatus,
  listTelecomSessions,
  listTelecomWebhookEvents,
  terminateTelecomSession,
} from "./telecom.admin.service.js";
import {
  listTelecomSupportRequests,
  updateTelecomSupportRequestStatus,
} from "./telecom.support.service.js";
import {
  TelecomSessionIdSchema,
  TelecomSessionQuerySchema,
  TelecomSupportQuerySchema,
  TelecomSupportUpdateSchema,
  TelecomWebhookQuerySchema,
} from "./telecom.validation.js";

const SessionParamsSchema = z.object({
  channel: z.enum(["ussd", "voice"]),
  id: TelecomSessionIdSchema,
});

function zodErrorToFields(err: ZodError | undefined) {
  return (err?.errors ?? []).map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
}

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const error = err as Error & { code?: string };
  if (error.code === "NOT_FOUND") {
    res.status(404).json({ success: false, error: { message: error.message } });
    return;
  }
  next(err);
}

export async function listSessionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = TelecomSessionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    res.json({ success: true, data: await listTelecomSessions(parsed.data) });
  } catch (err) {
    next(err);
  }
}

export async function terminateSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = SessionParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    res.json({
      success: true,
      message: "Session terminated.",
      data: {
        session: await terminateTelecomSession(
          parsed.data.channel,
          parsed.data.id,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listSupportRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = TelecomSupportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    res.json({
      success: true,
      data: await listTelecomSupportRequests(parsed.data),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSupportRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = TelecomSessionIdSchema.safeParse(req.params.id);
    const body = TelecomSupportUpdateSchema.safeParse(req.body);
    if (!id.success || !body.success) {
      const error = !id.success ? id.error : body.error;
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(error),
      });
      return;
    }
    res.json({
      success: true,
      message: "Support request updated.",
      data: {
        support_request: await updateTelecomSupportRequestStatus(
          id.data,
          body.data.status,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listWebhookEventsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = TelecomWebhookQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    res.json({
      success: true,
      data: await listTelecomWebhookEvents(parsed.data),
    });
  } catch (err) {
    next(err);
  }
}

export async function getConfigHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ success: true, data: await getTelecomConfigStatus() });
  } catch (err) {
    next(err);
  }
}
