import { env } from "../../config/env.js";
import { LocalImageStorageAdapter } from "./local-storage.adapter.js";
import type { ImageStorageAdapter } from "./storage.interface.js";

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

export type { ImageStorageAdapter } from "./storage.interface.js";
