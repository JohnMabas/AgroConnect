import { env } from "../../config/env.js";

export interface DetectedImageType {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function imageValidationError(message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code: "INVALID_IMAGE" });
}

export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length < 12) {
    return null;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mimeType: "image/png", extension: "png" };
  }

  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  return null;
}

export function validatePublicImageUpload(
  file: Express.Multer.File | undefined,
): DetectedImageType {
  if (!file) {
    throw imageValidationError("An image file is required.");
  }

  if (file.buffer.length > env.UPLOAD_MAX_FILE_SIZE_BYTES) {
    throw imageValidationError(
      `Image is too large. Maximum size is ${Math.floor(
        env.UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024),
      )} MB.`,
    );
  }

  const detected = detectImageType(file.buffer);
  if (!detected) {
    throw imageValidationError(
      "Unsupported file type. Upload a JPEG, PNG or WebP image.",
    );
  }

  return detected;
}
