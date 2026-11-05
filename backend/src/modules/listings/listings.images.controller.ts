import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  addImageFromUpload,
  addImageFromUrl,
  deleteImage,
  setPrimaryImage,
} from "./listings.images.service.js";

const AddImageUrlSchema = z.object({
  image_url: z.string().url("image_url must be a valid URL."),
});

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

// ─── POST /api/listings/:id/images ────────────────────────────────────────────

export async function addImageHandler(
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

    if (req.file) {
      const image = await addImageFromUpload(req.user.sub, listingId, req.file);
      res.status(201).json({ success: true, message: "Image uploaded.", data: { image } });
      return;
    }

    const parsed = AddImageUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const image = await addImageFromUrl(req.user.sub, listingId, parsed.data.image_url);
    res.status(201).json({ success: true, message: "Image added.", data: { image } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── DELETE /api/listings/:id/images/:imageId ─────────────────────────────────

export async function deleteImageHandler(
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
    const imageId = req.params["imageId"] as string | undefined;

    if (!listingId || !imageId) {
      res.status(400).json({ success: false, error: { message: "Listing ID and image ID required." } });
      return;
    }

    await deleteImage(req.user.sub, listingId, imageId);
    res.json({ success: true, message: "Image deleted." });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── PATCH /api/listings/:id/images/:imageId/primary ─────────────────────────

export async function setPrimaryImageHandler(
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
    const imageId = req.params["imageId"] as string | undefined;

    if (!listingId || !imageId) {
      res.status(400).json({ success: false, error: { message: "Listing ID and image ID required." } });
      return;
    }

    const image = await setPrimaryImage(req.user.sub, listingId, imageId);
    res.json({ success: true, message: "Primary image updated.", data: { image } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
