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
