import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import { emitToUser } from "../../realtime/registry.js";
import {
  acceptCall,
  createCall,
  endCall,
  getCallById,
  getCallConfigForUser,
  listCalls,
  rejectCall,
} from "./calls.service.js";
import {
  CallActionBodySchema,
  CallIdParamSchema,
  CreateCallSchema,
  ListCallsQuerySchema,
} from "./calls.validation.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((e) => ({ field: e.path.join("."), message: e.message }));
}

function requireAuth(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: "Authentication required." } });
    return false;
  }
  return true;
}

function handleServiceError(err: unknown, res: Response, next: NextFunction): void {
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
    default:
      next(err);
  }
}

export async function getCallConfigHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!requireAuth(req, res)) return;
  const data = getCallConfigForUser(req.user!.sub);
  res.json({ success: true, data });
}

export async function createCallHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreateCallSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const call = await createCall(req.user!.sub, parsed.data);
    emitToUser(call.callee_user_id, "call:incoming", { call });
    res.status(201).json({ success: true, data: { call } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listCallsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = ListCallsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    const result = await listCalls(req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getCallHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CallIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    const call = await getCallById(req.user!.sub, parsed.data.id);
    res.json({ success: true, data: { call } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

function parseAction(req: Request, res: Response): { id: string; reason?: string | null } | undefined {
  const idParsed = CallIdParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(idParsed.error) });
    return undefined;
  }
  const bodyParsed = CallActionBodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(bodyParsed.error) });
    return undefined;
  }
  return { id: idParsed.data.id, reason: bodyParsed.data.reason ?? null };
}

export async function acceptCallHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = parseAction(req, res);
    if (!parsed) return;
    const result = await acceptCall(req.user!.sub, parsed.id);
    if (result.changed) {
      emitToUser(result.call.caller_user_id, "call:accepted", { call: result.call });
    }
    res.json({ success: true, data: { call: result.call } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function rejectCallHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = parseAction(req, res);
    if (!parsed) return;
    const result = await rejectCall(req.user!.sub, parsed.id, parsed.reason);
    if (result.changed) {
      emitToUser(result.call.caller_user_id, "call:rejected", { call: result.call });
    }
    res.json({ success: true, data: { call: result.call } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function endCallHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = parseAction(req, res);
    if (!parsed) return;
    const result = await endCall(req.user!.sub, parsed.id, parsed.reason);
    if (result.changed) {
      const otherId =
        result.call.caller_user_id === req.user!.sub
          ? result.call.callee_user_id
          : result.call.caller_user_id;
      emitToUser(otherId, "call:ended", { call: result.call });
    }
    res.json({ success: true, data: { call: result.call } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
