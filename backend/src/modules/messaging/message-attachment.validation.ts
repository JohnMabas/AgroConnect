export interface DetectedMessageAttachment {
  attachment_type: "image" | "audio";
  mime_type: string;
  extension: string;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString("ascii");
}

function detectImage(buffer: Buffer): DetectedMessageAttachment | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { attachment_type: "image", mime_type: "image/jpeg", extension: "jpg" };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { attachment_type: "image", mime_type: "image/png", extension: "png" };
  }
  if (
    buffer.length >= 12 &&
    ascii(buffer, 0, 4) === "RIFF" &&
    ascii(buffer, 8, 12) === "WEBP"
  ) {
    return { attachment_type: "image", mime_type: "image/webp", extension: "webp" };
  }
  return null;
}

function parseMp4Brand(buffer: Buffer): string | null {
  if (buffer.length < 12 || ascii(buffer, 4, 8) !== "ftyp") {
    return null;
  }
  return ascii(buffer, 8, 12);
}

function detectAudio(buffer: Buffer): DetectedMessageAttachment | null {
  if (buffer.length >= 4 && ascii(buffer, 0, 4) === "OggS") {
    // Ogg container; commonly used for Opus voice notes.
    return { attachment_type: "audio", mime_type: "audio/ogg", extension: "ogg" };
  }
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { attachment_type: "audio", mime_type: "audio/webm", extension: "webm" };
  }
  if (
    buffer.length >= 12 &&
    ascii(buffer, 0, 4) === "RIFF" &&
    ascii(buffer, 8, 12) === "WAVE"
  ) {
    return { attachment_type: "audio", mime_type: "audio/wav", extension: "wav" };
  }
  if (buffer.length >= 3 && ascii(buffer, 0, 3) === "ID3") {
    return { attachment_type: "audio", mime_type: "audio/mpeg", extension: "mp3" };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && ((buffer[1] ?? 0) & 0xe0) === 0xe0) {
    return { attachment_type: "audio", mime_type: "audio/mpeg", extension: "mp3" };
  }

  const brand = parseMp4Brand(buffer);
  if (brand) {
    const mp4Brands = new Set([
      "isom", "iso2", "iso3", "iso4", "iso5", "iso6",
      "mp41", "mp42", "M4A ", "M4B ", "M4P ", "qt  ",
      "avc1", "dash", "3gp4", "3gp5",
    ]);
    if (mp4Brands.has(brand)) {
      return { attachment_type: "audio", mime_type: "audio/mp4", extension: "m4a" };
    }
  }

  return null;
}

export function detectMessageAttachment(
  buffer: Buffer,
): DetectedMessageAttachment | null {
  return detectImage(buffer) ?? detectAudio(buffer);
}
