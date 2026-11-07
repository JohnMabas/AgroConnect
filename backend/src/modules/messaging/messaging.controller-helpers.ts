import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodType } from "zod";

export function zodErrorToFields(err: ZodError) {
  return err.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
}

export function handleMessagingServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const error = err as Error & { code?: string };

  switch (error.code) {
    case "NOT_FOUND":
      res.status(404).json({ success: false, error: { message: error.message } });
      return;
    case "FORBIDDEN":
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    case "INVALID_OPERATION":
      res.status(422).json({ success: false, error: { message: error.message } });
      return;
    case "DUPLICATE_CONVERSATION":
      res.status(409).json({ success: false, error: { message: error.message } });
      return;
    default:
      next(err);
  }
}

export function requireMessagingAuth(req: Request, res: Response): boolean {
  if (!req.user) {
    res
      .status(401)
      .json({ success: false, error: { message: "Authentication required." } });
    return false;
  }
  return true;
}

export function parseConversationId(
  req: Request,
  res: Response,
  schema: ZodType<string>,
): string | undefined {
  const parsed = schema.safeParse(req.params["id"]);
  if (!parsed.success || !parsed.data) {
    res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: zodErrorToFields(parsed.error!),
    });
    return undefined;
  }
  return parsed.data;
}

export function rejectSenderImpersonation(
  req: Request,
  res: Response,
  userId: string,
): boolean {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const claimedSender = body["sender_user_id"] ?? body["sender_id"];

  if (claimedSender !== undefined && claimedSender !== userId) {
    res.status(403).json({
      success: false,
      error: { message: "You cannot send messages as another user." },
    });
    return true;
  }

  return false;
}
