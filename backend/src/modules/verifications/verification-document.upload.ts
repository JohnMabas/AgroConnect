import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../../config/env.js";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

class DocumentUploadValidationError extends Error {}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.VERIFICATION_DOCUMENT_MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new DocumentUploadValidationError(
          "Unsupported document type. Upload a PDF, JPEG, PNG or WebP file.",
        ),
      );
      return;
    }
    callback(null, true);
  },
});

export function uploadVerificationDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single("document")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Document is too large. Maximum size is ${Math.floor(
              env.VERIFICATION_DOCUMENT_MAX_FILE_SIZE_BYTES / (1024 * 1024),
            )} MB.`
          : err.code === "LIMIT_UNEXPECTED_FILE"
            ? "Upload exactly one document using the 'document' field."
            : "The document upload could not be processed.";
      res.status(422).json({
        success: false,
        error: { message },
      });
      return;
    }

    if (err instanceof DocumentUploadValidationError) {
      res.status(422).json({
        success: false,
        error: { message: err.message },
      });
      return;
    }

    next(err);
  });
}
