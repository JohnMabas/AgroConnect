import { env } from "../../config/env.js";
import type { SavePrivateMessageMediaInput } from "./local-storage.driver.js";
import { LocalImageStorageAdapter } from "./local-storage.adapter.js";
import { LocalPublicImageStorage } from "./local-public-image.storage.js";
import { LocalPrivateDocumentStorageAdapter } from "./local-private-document.adapter.js";
import { LocalStorageService } from "./local-storage.driver.js";
import { CloudinaryStorageService } from "./cloudinary-storage.driver.js";
import { CloudinaryPublicImageStorage } from "./cloudinary-public-image.storage.js";
import type {
  ImageStorageAdapter,
  PrivateDocumentStorageAdapter,
  StorageService,
} from "./storage.interface.js";
import type { PublicImageStorageAdapter } from "./public-image.storage.interface.js";

/**
 * Active image storage adapter.
 */
export const imageStorage: ImageStorageAdapter = new LocalImageStorageAdapter(
  env.UPLOAD_STORAGE_PATH,
  env.UPLOAD_PUBLIC_PREFIX,
);

export const publicImageStorage: PublicImageStorageAdapter =
  env.PUBLIC_IMAGE_STORAGE_DRIVER === "cloudinary"
    ? new CloudinaryPublicImageStorage()
    : new LocalPublicImageStorage(
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
type MessageMediaStorageService = StorageService & {
  saveMedia?: (
    input: SavePrivateMessageMediaInput,
  ) => Promise<{ storageKey: string }>;
  readMedia?: (storageKey: string) => Promise<Buffer>;
  deleteMedia?: (storageKey: string) => Promise<void>;
};

export const messageStorage: MessageMediaStorageService =
  env.STORAGE_DRIVER === "cloudinary"
    ? new CloudinaryStorageService()
    : new LocalStorageService(env.LOCAL_UPLOAD_DIR);

export const privateMessageMediaStorage = messageStorage;

export type {
  ImageStorageAdapter,
  PrivateDocumentStorageAdapter,
  StoredPrivateDocument,
  StorageService,
  StorageStreamResult,
} from "./storage.interface.js";
export type {
  PublicImageFolder,
  PublicImageStorageAdapter,
  StoredPublicImage,
} from "./public-image.storage.interface.js";
