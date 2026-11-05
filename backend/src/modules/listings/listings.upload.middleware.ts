import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../../config/env.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

class UploadValidationError extends Error {}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new UploadValidationError(
          "Unsupported file type. Upload a JPEG, PNG or WebP image.",
        ),
      );
      return;
    }
    callback(null, true);
  },
});

/**
 * Parse an optional multipart `image` field. JSON requests are left untouched
 * so that a pre-existing image URL can still be linked (development fallback).
 */
export function uploadSingleImage(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single("image")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Image is too large. Maximum size is ${Math.floor(
              env.UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024),
            )} MB.`
          : "The image upload could not be processed.";
      res.status(422).json({
        success: false,
        error: { message },
      });
      return;
    }

    if (err instanceof UploadValidationError) {
      res.status(422).json({
        success: false,
        error: { message: err.message },
      });
      return;
    }

    next(err);
  });
}
