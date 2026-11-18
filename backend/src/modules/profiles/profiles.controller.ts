import type { Request, Response, NextFunction } from "express";
import type { ZodError } from "zod";
import { UpsertProfileSchema } from "./profiles.validation.js";
import {
  getOrCreateProfile,
  updateProfile,
  setProfileImage,
  deleteProfileImage,
} from "./profiles.service.js";
import { handleImageServiceError } from "../uploads/public-image.controller.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

// ─── GET /api/profiles/me ─────────────────────────────────────────────────────

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

    const profile = await getOrCreateProfile(req.user.sub);
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/profiles/me ─────────────────────────────────────────────────────

export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const parsed = UpsertProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const profile = await updateProfile(req.user.sub, parsed.data);
    res.json({ success: true, message: "Profile updated.", data: { profile } });
  } catch (err) {
    next(err);
  }
}

export async function uploadProfileImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const profile = await setProfileImage(req.user.sub, req.file);
    res.json({ success: true, message: "Profile picture uploaded.", data: { profile } });
  } catch (err) {
    handleImageServiceError(err, res, next);
  }
}

export async function deleteProfileImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const profile = await deleteProfileImage(req.user.sub);
    res.json({ success: true, message: "Profile picture removed.", data: { profile } });
  } catch (err) {
    handleImageServiceError(err, res, next);
  }
}
