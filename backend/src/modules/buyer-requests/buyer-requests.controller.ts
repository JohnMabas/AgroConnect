import type { Request, Response, NextFunction } from "express";
import type { ZodError } from "zod";
import {
  BuyerRequestIdSchema,
  CreateBuyerRequestSchema,
  ListBuyerRequestsQuerySchema,
  ListMyBuyerRequestsQuerySchema,
  UpdateBuyerRequestSchema,
} from "./buyer-requests.validation.js";
import {
  createBuyerRequest,
  getBuyerRequestById,
  getMyBuyerRequests,
  listOpenBuyerRequests,
  updateBuyerRequest,
  pauseBuyerRequest,
  reopenBuyerRequest,
  fulfillBuyerRequest,
  cancelBuyerRequest,
} from "./buyer-requests.service.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const e = err as Error & { code?: string };
  switch (e.code) {
    case "NOT_FOUND":
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    case "FORBIDDEN":
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    case "INVALID_OPERATION":
      res.status(422).json({ success: false, error: { message: e.message } });
      return;
    default:
      next(err);
  }
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

function parseId(
  req: Request,
  res: Response,
): string | undefined {
  const rawId = req.params["id"];
  const parsed = BuyerRequestIdSchema.safeParse(rawId);
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

// ─── POST /api/buyer-requests ────────────────────────────────────────────────

export async function createBuyerRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = CreateBuyerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const request = await createBuyerRequest(req.user!.sub, parsed.data);
    res.status(201).json({
      success: true,
      message: "Buyer request created.",
      data: { request },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── GET /api/buyer-requests ─────────────────────────────────────────────────

export async function listBuyerRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = ListBuyerRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listOpenBuyerRequests(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/buyer-requests/me ──────────────────────────────────────────────

export async function getMyBuyerRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = ListMyBuyerRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await getMyBuyerRequests(req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/buyer-requests/:id ─────────────────────────────────────────────

export async function getBuyerRequestByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const request = await getBuyerRequestById(
      id,
      req.user
        ? { userId: req.user.sub, roles: req.user.roles ?? [] }
        : undefined,
    );
    res.json({ success: true, data: { request } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── PUT /api/buyer-requests/:id ─────────────────────────────────────────────

export async function updateBuyerRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseId(req, res);
    if (!id) return;

    const parsed = UpdateBuyerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const request = await updateBuyerRequest(
      req.user!.sub,
      id,
      parsed.data,
    );
    res.json({
      success: true,
      message: "Buyer request updated.",
      data: { request },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── Lifecycle transitions ───────────────────────────────────────────────────

function transitionHandler(
  action: (userId: string, id: string) => Promise<unknown>,
  message: string,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!requireAuth(req, res)) return;

      const id = parseId(req, res);
      if (!id) return;

      const request = await action(req.user!.sub, id);
      res.json({ success: true, message, data: { request } });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  };
}

export const pauseBuyerRequestHandler = transitionHandler(
  pauseBuyerRequest,
  "Buyer request paused.",
);

export const reopenBuyerRequestHandler = transitionHandler(
  reopenBuyerRequest,
  "Buyer request reopened.",
);

export const fulfillBuyerRequestHandler = transitionHandler(
  fulfillBuyerRequest,
  "Buyer request fulfilled.",
);

export const cancelBuyerRequestHandler = transitionHandler(
  cancelBuyerRequest,
  "Buyer request cancelled.",
);
