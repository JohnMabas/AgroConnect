import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { logUploadStage } from "./upload-stage-logger.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

class UploadValidationError extends Error {}

export function uploadSinglePublicImage(field = "image") {
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
  }).single(field);

  return (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      const listingIdParam = req.params["id"];
      const listingId = Array.isArray(listingIdParam)
        ? listingIdParam[0] ?? "unknown"
        : listingIdParam ?? "unknown";

      if (err instanceof multer.MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? `Image is too large. Maximum size is ${Math.floor(
                env.UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024),
              )} MB.`
            : "The image upload could not be processed.";
        logUploadStage(listingId, "failed", {
          code: "INVALID_IMAGE",
          message,
          status: 400,
        });
        res.status(400).json({
          success: false,
          error: { message },
        });
        return;
      }

      if (err instanceof UploadValidationError) {
        logUploadStage(listingId, "failed", {
          code: "INVALID_IMAGE",
          message: err.message,
          status: 400,
        });
        res.status(400).json({
          success: false,
          error: { message: err.message },
        });
        return;
      }

      logUploadStage(listingId, "failed", {
        code: "UPLOAD_PARSE_ERROR",
        message: err instanceof Error ? err.message : "Upload failed.",
        status: 500,
      });
      next(err);
    });
  };
}
