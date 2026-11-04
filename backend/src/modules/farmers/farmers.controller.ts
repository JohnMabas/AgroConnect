import type { Request, Response, NextFunction } from "express";
import type { ZodError } from "zod";
import { UpsertFarmerProfileSchema } from "./farmers.validation.js";
import {
  getMyFarmerProfile,
  createFarmerProfile,
  updateFarmerProfile,
} from "./farmers.service.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

// ─── GET /api/farmers/profile/me ─────────────────────────────────────────────

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const profile = await getMyFarmerProfile(req.user.sub);
    res.json({ success: true, data: { profile } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── POST /api/farmers/profile ────────────────────────────────────────────────

export async function createProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const parsed = UpsertFarmerProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const profile = await createFarmerProfile(req.user.sub, parsed.data);
    res.status(201).json({ success: true, message: "Farmer profile created.", data: { profile } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "DUPLICATE_PROFILE") {
      res.status(409).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── PUT /api/farmers/profile/me ─────────────────────────────────────────────

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const parsed = UpsertFarmerProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const profile = await updateFarmerProfile(req.user.sub, parsed.data);
    res.json({ success: true, message: "Farmer profile updated.", data: { profile } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}
