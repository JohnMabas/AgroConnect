import type { Request, Response, NextFunction } from "express";
import { AdjustmentSchema } from "./listings.validation.js";
import {
  getInventory,
  createAdjustment,
  getAdjustments,
} from "./listings.inventory.service.js";

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

// ─── GET /api/listings/:id/inventory ─────────────────────────────────────────

export async function getInventoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const listingId = req.params["id"] as string | undefined;
    if (!listingId) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }

    const inventory = await getInventory(req.user.sub, listingId);
    res.json({ success: true, data: { inventory } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── POST /api/listings/:id/inventory/adjustments ────────────────────────────

export async function createAdjustmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const listingId = req.params["id"] as string | undefined;
    if (!listingId) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }

    const parsed = AdjustmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
      });
      return;
    }

    const adjustment = await createAdjustment(req.user.sub, listingId, parsed.data);
    res.status(201).json({ success: true, message: "Adjustment recorded.", data: { adjustment } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── GET /api/listings/:id/inventory/adjustments ─────────────────────────────

export async function getAdjustmentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const listingId = req.params["id"] as string | undefined;
    if (!listingId) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }

    const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10) || 20),
    );

    const result = await getAdjustments(req.user.sub, listingId, page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
