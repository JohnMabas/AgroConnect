import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  addImageFromUpload,
  addImageFromUrl,
  deleteImage,
  setPrimaryImage,
} from "./listings.images.service.js";
import { logUploadStage } from "../uploads/upload-stage-logger.js";

const AddImageUrlSchema = z.object({
  image_url: z
    .string()
    .url("image_url must be a valid URL.")
    .max(500, "image_url must be 500 characters or fewer."),
});

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
  listingId: string,
): void {
  const e = err as Error & { code?: string };
  if (res.headersSent || res.locals.timedOut) return;
  const statusByCode: Record<string, number> = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    INVALID_IMAGE: 400,
    INVALID_OPERATION: 422,
    UPLOAD_TIMEOUT: 504,
  };
  const status = e.code ? statusByCode[e.code] ?? 500 : 500;

  logUploadStage(listingId, "failed", {
    code: e.code ?? "UNKNOWN",
    message: e.message,
    status,
  });

  if (status === 500) {
    next(err);
    return;
  }

  res.status(status).json({
    success: false,
    error: {
      message:
        status === 504
          ? "Upload timed out. Please retry."
          : e.message,
    },
  });
}

// ─── POST /api/listings/:id/images ────────────────────────────────────────────

export async function addImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const listingId = req.params["id"] as string | undefined;

  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    if (!listingId) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }

    logUploadStage(listingId, "received", { bytes: req.file?.size ?? 0 });

    if (req.file) {
      const image = await addImageFromUpload(req.user.sub, listingId, req.file);
      if (res.locals.timedOut) return;
      res.status(201).json({ success: true, message: "Image uploaded.", data: { image } });
      logUploadStage(listingId, "response_sent", { imageId: image.id, status: 201 });
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
    if (res.locals.timedOut) return;
    res.status(201).json({ success: true, message: "Image added.", data: { image } });
    logUploadStage(listingId, "response_sent", { imageId: image.id, status: 201 });
  } catch (err) {
    handleServiceError(err, res, next, listingId ?? "unknown");
  }
}

// ─── DELETE /api/listings/:id/images/:imageId ─────────────────────────────────

export async function deleteImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const listingId = req.params["id"] as string | undefined;

  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const imageId = req.params["imageId"] as string | undefined;

    if (!listingId || !imageId) {
      res.status(400).json({ success: false, error: { message: "Listing ID and image ID required." } });
      return;
    }

    await deleteImage(req.user.sub, listingId, imageId);
    if (res.locals.timedOut) return;
    res.json({ success: true, message: "Image deleted." });
  } catch (err) {
    handleServiceError(err, res, next, listingId ?? "unknown");
  }
}

// ─── PATCH /api/listings/:id/images/:imageId/primary ─────────────────────────

export async function setPrimaryImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const listingId = req.params["id"] as string | undefined;

  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const imageId = req.params["imageId"] as string | undefined;

    if (!listingId || !imageId) {
      res.status(400).json({ success: false, error: { message: "Listing ID and image ID required." } });
      return;
    }

    const image = await setPrimaryImage(req.user.sub, listingId, imageId);
    if (res.locals.timedOut) return;
    res.json({ success: true, message: "Primary image updated.", data: { image } });
  } catch (err) {
    handleServiceError(err, res, next, listingId ?? "unknown");
  }
}
