import { env } from "../../config/env.js";
import { LocalImageStorageAdapter } from "./local-storage.adapter.js";
import { LocalPrivateDocumentStorageAdapter } from "./local-private-document.adapter.js";
import type {
  ImageStorageAdapter,
  PrivateDocumentStorageAdapter,
} from "./storage.interface.js";

/**
 * Active image storage adapter.
 *
 * Only local filesystem storage is configured at this stage. Replace this
 * factory with an object-storage adapter (for example S3/R2) when production
 * credentials and a bucket are provisioned. Never expose storage credentials
 * to the frontend.
 */
export const imageStorage: ImageStorageAdapter = new LocalImageStorageAdapter(
  env.UPLOAD_STORAGE_PATH,
  env.UPLOAD_PUBLIC_PREFIX,
);

/**
 * Private verification-document storage. This must never be exposed through a
 * static middleware path.
 */
export const privateDocumentStorage: PrivateDocumentStorageAdapter =
  new LocalPrivateDocumentStorageAdapter(
    env.VERIFICATION_DOCUMENT_STORAGE_PATH,
  );

export type {
  ImageStorageAdapter,
  PrivateDocumentStorageAdapter,
  StoredPrivateDocument,
} from "./storage.interface.js";
