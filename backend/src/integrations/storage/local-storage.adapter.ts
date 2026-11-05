import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ImageStorageAdapter,
  SaveImageInput,
  StoredImage,
} from "./storage.interface.js";

/**
 * Development/local filesystem storage adapter.
 *
 * Files are written outside PostgreSQL under UPLOAD_STORAGE_PATH. Filenames are
 * generated from random UUIDs and a server-detected extension; client-supplied
 * filenames are never used in filesystem paths.
 *
 * This is intentionally a development solution. Render's filesystem is
 * ephemeral, so production deployments must provide an object-storage
 * adapter (S3-compatible or similar) that implements ImageStorageAdapter.
 */
export class LocalImageStorageAdapter implements ImageStorageAdapter {
  private readonly root: string;
  private readonly publicPrefix: string;

  constructor(rootPath: string, publicPrefix = "/uploads") {
    this.root = path.resolve(rootPath);
    this.publicPrefix = publicPrefix.replace(/\/+$/, "");
  }

  async saveImage(input: SaveImageInput): Promise<StoredImage> {
    const directory = path.join(this.root, "listings", input.listingId);
    await mkdir(directory, { recursive: true, mode: 0o750 });

    const filename = `${randomUUID()}.${input.extension}`;
    const absolutePath = path.join(directory, filename);

    await writeFile(absolutePath, input.buffer, { mode: 0o640, flag: "wx" });

    const storageKey = path
      .join("listings", input.listingId, filename)
      .split(path.sep)
      .join("/");

    return {
      storageKey,
      imageUrl: `${this.publicPrefix}/${storageKey}`,
    };
  }

  async deleteImage(storageKey: string): Promise<void> {
    const absolutePath = path.resolve(this.root, storageKey);

    // Refuse to delete anything outside the configured upload root.
    if (
      absolutePath !== this.root &&
      !absolutePath.startsWith(`${this.root}${path.sep}`)
    ) {
      return;
    }

    try {
      await unlink(absolutePath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw err;
      }
    }
  }
}
