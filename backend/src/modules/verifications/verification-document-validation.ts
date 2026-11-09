export interface DetectedDocumentType {
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  extension: "pdf" | "jpg" | "png" | "webp";
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Detect supported verification-document types from file contents. Client
 * MIME types, filenames and extensions are never trusted for validation.
 */
export function detectVerificationDocument(
  buffer: Buffer,
): DetectedDocumentType | null {
  if (buffer.length < 5) {
    return null;
  }

  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { mimeType: "application/pdf", extension: "pdf" };
  }

  if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mimeType: "image/png", extension: "png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  return null;
}
