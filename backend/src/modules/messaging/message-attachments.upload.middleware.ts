import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../../config/env.js";

class UploadValidationError extends Error {}

const maxFileSize = Math.max(
  env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  env.MESSAGE_MEDIA_MAX_IMAGE_SIZE_BYTES,
  env.MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES,
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
    files: env.MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE,
  },
  fileFilter: (_req, file, callback) => {
    const mime = (file.mimetype || "").toLowerCase();
    const allowed =
      mime.startsWith("image/") ||
      mime.startsWith("audio/") ||
      mime === "video/webm" ||
      mime === "application/octet-stream";
    if (!allowed) {
      callback(
        new UploadValidationError("Unsupported attachment content type."),
      );
      return;
    }
    callback(null, true);
  },
});

export function uploadMessageAttachments(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const contentType = req.headers["content-type"] ?? "";
  if (!String(contentType).includes("multipart/form-data")) {
    next();
    return;
  }

  upload.array("attachments", env.MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE)(
    req,
    res,
    (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof multer.MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "Attachment exceeds the maximum allowed file size."
            : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
              ? `A message can include at most ${env.MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE} attachments.`
              : "Attachment upload could not be processed.";
        res.status(422).json({ success: false, error: { message } });
        return;
      }

      if (err instanceof UploadValidationError) {
        res.status(422).json({ success: false, error: { message: err.message } });
        return;
      }

      next(err);
    },
  );
}
