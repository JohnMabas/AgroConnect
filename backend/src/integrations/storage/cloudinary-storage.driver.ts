import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";
import type {
  StorageObjectMeta,
  StorageRange,
  StorageSaveOptions,
  StorageSaveResult,
  StorageService,
  StorageStreamResult,
} from "./storage.interface.js";

export interface SavePrivateMessageMediaInput {
  conversationId: string;
  messageId: string;
  buffer: Buffer;
  extension: string;
}

export interface StoredPrivateMessageMedia {
  storageKey: string;
  resourceType: "image" | "video" | "raw";
  publicId: string;
}

function inferResourceType(
  mimeType: string,
  explicit?: "image" | "video" | "raw",
): "image" | "video" | "raw" {
  if (explicit) return explicit;
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) {
    return "video";
  }
  return "raw";
}

function notFoundError(message = "Attachment file is unavailable."): Error & {
  code: string;
} {
  return Object.assign(new Error(message), { code: "STORAGE_NOT_FOUND" });
}

export class CloudinaryStorageService implements StorageService {
  private configured = false;

  private ensureConfigured(): void {
    if (this.configured) return;
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    this.configured = true;
  }

  async save(
    key: string,
    body: Buffer,
    mimeType: string,
    options?: StorageSaveOptions,
  ): Promise<StorageSaveResult> {
    this.ensureConfigured();
    const resourceType = inferResourceType(mimeType, options?.resourceType);
    const folder = env.CLOUDINARY_FOLDER;
    const uploadPublicId = options?.publicId ?? key;

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          type: "authenticated",
          folder,
          public_id: uploadPublicId,
          overwrite: false,
          use_filename: false,
          unique_filename: false,
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        },
      );
      stream.end(body);
    });

    const actualPublicId = String(
      result?.public_id ??
        (folder ? `${folder}/${uploadPublicId}` : uploadPublicId),
    );

    return {
      key, // keep canonical/logical storage key consistent
      mimeType,
      size: typeof result?.bytes === "number" ? result.bytes : body.length,
      resourceType,
      publicId: actualPublicId,
    };
  }

  async getStream(
    key: string,
    range?: StorageRange,
    options?: StorageObjectMeta,
  ): Promise<StorageStreamResult> {
    this.ensureConfigured();
    const resourceType = inferResourceType(
      options?.mimeType ?? "",
      options?.resourceType,
    );
    const publicId = options?.publicId ?? key;
    const expiresAt = Math.floor(Date.now() / 1000) + 300;

    // Build an authenticated, signed delivery URL on the server only. Never
    // expose this URL to the browser/client.
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type: "authenticated",
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });

    const headers: Record<string, string> = {};
    if (range) {
      const end = range.end !== undefined ? String(range.end) : "";
      headers.Range = `bytes=${range.start}-${end}`;
    }

    const res = await fetch(signedUrl, { headers });
    if (res.status === 404) {
      throw notFoundError();
    }
    if (res.status === 416) {
      throw Object.assign(
        new Error("Requested attachment range is unavailable."),
        { code: "STORAGE_NOT_FOUND" },
      );
    }
    if (!(res.ok || res.status === 206)) {
      const err = Object.assign(
        new Error(`Cloudinary fetch failed with status ${res.status}.`),
        { code: "STORAGE_ERROR", status: res.status },
      );
      throw err;
    }

    const contentType = res.headers.get("content-type") ?? options?.mimeType;
    const contentLengthHeader = res.headers.get("content-length");
    const contentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : undefined;

    let totalSize: number | undefined;
    let parsedRange:
      | { start: number; end: number; total: number }
      | undefined;
    const contentRange = res.headers.get("content-range");
    if (contentRange) {
      const m = /bytes\s+(\d+)-(\d+)\/(\d+|\*)/i.exec(contentRange);
      if (m) {
        const start = Number(m[1]);
        const end = Number(m[2]);
        const total = m[3] === "*" ? undefined : Number(m[3]);
        if (Number.isFinite(start) && Number.isFinite(end)) {
          parsedRange = {
            start,
            end,
            total:
              total !== undefined && Number.isFinite(total) ? total : end + 1,
          };
          totalSize = parsedRange.total;
        }
      }
    }
    if (
      !totalSize &&
      !range &&
      contentLength !== undefined &&
      Number.isFinite(contentLength)
    ) {
      totalSize = contentLength;
    }

    if (!res.body) {
      throw Object.assign(
        new Error("Cloudinary response did not include a body."),
        { code: "STORAGE_ERROR" },
      );
    }

    const nodeStream = Readable.fromWeb(res.body as any);
    return {
      stream: nodeStream,
      contentType,
      contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
      totalSize,
      acceptsRanges: true,
      range: parsedRange,
    };
  }

  async exists(key: string, options?: StorageObjectMeta): Promise<boolean> {
    this.ensureConfigured();
    const resourceType = inferResourceType(
      options?.mimeType ?? "",
      options?.resourceType,
    );
    const publicId = options?.publicId ?? key;
    try {
      await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        type: "authenticated",
      });
      return true;
    } catch (error: any) {
      const status = error?.http_code ?? error?.error?.http_code;
      if (status === 404) return false;
      throw error;
    }
  }

  async delete(key: string, options?: StorageObjectMeta): Promise<void> {
    this.ensureConfigured();
    const resourceType = inferResourceType(
      options?.mimeType ?? "",
      options?.resourceType,
    );
    const publicId = options?.publicId ?? key;
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: "authenticated",
        invalidate: true,
      });
    } catch (error: any) {
      const status = error?.http_code ?? error?.error?.http_code;
      if (status === 404) return;
      throw error;
    }
  }

  async saveMedia(
    input: SavePrivateMessageMediaInput,
  ): Promise<StoredPrivateMessageMedia> {
    this.ensureConfigured();
    const { detectMessageAttachment } = await import(
      "../../modules/messaging/message-attachment.validation.js"
    );
    const detected = detectMessageAttachment(input.buffer);
    const mimeType = detected?.mime_type ?? "application/octet-stream";
    const resourceType = inferResourceType(mimeType);
    const logicalKey = `messages/${input.conversationId}/${input.messageId}/${randomUUID()}`;
    const saved = await this.save(logicalKey, input.buffer, mimeType, {
      resourceType,
      publicId: logicalKey,
    });
    return {
      storageKey: logicalKey,
      resourceType: saved.resourceType ?? resourceType,
      publicId: saved.publicId ?? logicalKey,
    };
  }

  async readMedia(_storageKey: string): Promise<Buffer> {
    throw Object.assign(
      new Error(
        "readMedia is not supported for Cloudinary storage; use getStream.",
      ),
      { code: "STORAGE_ERROR" },
    );
  }

  async deleteMedia(storageKey: string): Promise<void> {
    // Best-effort delete across possible resource types for legacy/unknown rows.
    for (const resourceType of ["video", "image", "raw"] as const) {
      try {
        await this.delete(storageKey, {
          resourceType,
          publicId: storageKey,
        });
        return;
      } catch {
        // try next
      }
    }
  }
}
