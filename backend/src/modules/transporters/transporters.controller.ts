import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  CreateTransporterProfileSchema,
  ListAvailableTransportersQuerySchema,
  TransporterIdSchema,
  TransportSuspendSchema,
  UpdateTransporterProfileSchema,
} from "./transporters.validation.js";
import {
  approveTransporter,
  createTransporterProfile,
  getMyTransporterProfile,
  getTransporterById,
  listAvailableTransporters,
  reactivateTransporter,
  suspendTransporter,
  updateTransporterProfile,
} from "./transporters.service.js";

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

function parseId(req: Request, res: Response): string | undefined {
  const parsed = TransporterIdSchema.safeParse(req.params["id"]);
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
  const error = err as Error & { code?: string; status?: number };
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
      next(err);
  }
}

export async function createTransporterProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = CreateTransporterProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const profile = await createTransporterProfile(req.user!.sub, parsed.data);
    res.status(201).json({
      success: true,
      message: "Transporter profile created. Awaiting administrator approval.",
      data: { profile },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getMyTransporterProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const profile = await getMyTransporterProfile(req.user!.sub);
    res.json({ success: true, data: { profile } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function updateTransporterProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = UpdateTransporterProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const profile = await updateTransporterProfile(
      req.user!.sub,
      parsed.data,
    );
    res.json({
      success: true,
      message: "Transporter profile updated.",
      data: { profile },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listAvailableTransportersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = ListAvailableTransportersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listAvailableTransporters(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getTransporterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseId(req, res);
    if (!id) return;

    const profile = await getTransporterById(
      req.user!.sub,
      req.user!.roles ?? [],
      id,
    );
    res.json({ success: true, data: { profile } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function approveTransporterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseId(req, res);
    if (!id) return;

    const profile = await approveTransporter(req.user!.sub, id);
    res.json({
      success: true,
      message: "Transporter approved.",
      data: { profile },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function suspendTransporterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseId(req, res);
    if (!id) return;

    const parsed = TransportSuspendSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const profile = await suspendTransporter(
      req.user!.sub,
      id,
      parsed.data,
    );
    res.json({
      success: true,
      message: "Transporter suspended.",
      data: { profile },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function reactivateTransporterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseId(req, res);
    if (!id) return;

    const profile = await reactivateTransporter(req.user!.sub, id);
    res.json({
      success: true,
      message: "Transporter reactivated.",
      data: { profile },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
