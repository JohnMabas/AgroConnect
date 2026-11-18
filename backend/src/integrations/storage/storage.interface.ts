import type { Readable } from "node:stream";

export interface SaveImageInput {
  listingId: string;
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

export interface StoredImage {
  /** Safe, generated storage key. Never derived from a client-supplied filename. */
  storageKey: string;
  /** Public URL or path used by the application to display the image. */
  imageUrl: string;
}

/**
 * Storage adapter contract. The local adapter is used in development because
 * no managed object-storage service is configured for AgroConnect yet.
 *
 * A production adapter (for example S3-compatible object storage) must
 * implement the same interface. The rest of the application must not know or
 * care which adapter is active.
 */
export interface ImageStorageAdapter {
  saveImage(input: SaveImageInput): Promise<StoredImage>;
  deleteImage(storageKey: string): Promise<void>;
}

export interface SavePrivateDocumentInput {
  verificationId: string;
  buffer: Buffer;
  extension: string;
}

export interface StoredPrivateDocument {
  /** Generated private storage key. Never exposed in API responses. */
  storageKey: string;
}

/**
 * Private storage contract for identity and business verification documents.
 * These files must never be served from the public upload directory.
 */
export interface PrivateDocumentStorageAdapter {
  saveDocument(input: SavePrivateDocumentInput): Promise<StoredPrivateDocument>;
  readDocument(storageKey: string): Promise<Buffer>;
  deleteDocument(storageKey: string): Promise<void>;
}

export type StorageDriver = "local" | "cloudinary";

export interface StorageSaveOptions {
  resourceType?: "image" | "video" | "raw";
  publicId?: string;
}

export interface StorageSaveResult {
  /** Canonical storage key (or provider public id) stored with the record. */
  key: string;
  mimeType: string;
  size?: number;
  resourceType?: "image" | "video" | "raw";
  publicId?: string;
}

export interface StorageRange {
  start: number;
  end?: number;
}

export interface StorageObjectMeta {
  resourceType?: "image" | "video" | "raw";
  publicId?: string;
  mimeType?: string;
}

export interface StorageStreamResult {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
  totalSize?: number;
  acceptsRanges: boolean;
  range?: { start: number; end: number; total: number };
}

/**
 * Private file/object storage contract for message attachments. Drivers must
 * never expose public URLs; downloads are always streamed through the backend
 * after authorization checks.
 */
export interface StorageService {
  save(key: string, body: Buffer, mimeType: string, options?: StorageSaveOptions): Promise<StorageSaveResult>;
  getStream(key: string, range?: StorageRange, options?: StorageObjectMeta): Promise<StorageStreamResult>;
  exists(key: string, options?: StorageObjectMeta): Promise<boolean>;
  delete(key: string, options?: StorageObjectMeta): Promise<void>;
}
