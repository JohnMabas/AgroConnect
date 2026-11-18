import { env } from "../../config/env.js";
import { LocalImageStorageAdapter } from "./local-storage.adapter.js";
import { LocalPrivateDocumentStorageAdapter } from "./local-private-document.adapter.js";
import { LocalStorageService } from "./local-storage.driver.js";
import { CloudinaryStorageService } from "./cloudinary-storage.driver.js";
import type {
  ImageStorageAdapter,
  PrivateDocumentStorageAdapter,
  StorageService,
} from "./storage.interface.js";

/**
 * Active image storage adapter.
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

/**
 * Private message media storage. Driver selected by STORAGE_DRIVER.
 * Files/objects remain private and are only served through authorized backend
 * streaming endpoints.
 */
export const messageStorage: StorageService & {
  saveMedia?: Function;
  readMedia?: Function;
  deleteMedia?: Function;
} =
  env.STORAGE_DRIVER === "cloudinary"
    ? new CloudinaryStorageService()
    : new LocalStorageService(env.LOCAL_UPLOAD_DIR);

// Backwards-compatible export name used by existing messaging code paths.
export const privateMessageMediaStorage = messageStorage as any;

export type {
  ImageStorageAdapter,
  PrivateDocumentStorageAdapter,
  StoredPrivateDocument,
  StorageService,
  StorageStreamResult,
} from "./storage.interface.js";
