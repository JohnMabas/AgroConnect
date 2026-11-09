import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  PrivateDocumentStorageAdapter,
  SavePrivateDocumentInput,
  StoredPrivateDocument,
} from "./storage.interface.js";

/**
 * Local, private filesystem storage for verification documents.
 *
 * The root directory must never be mounted under a public static path. Keys are
 * generated from UUIDs and server-detected extensions only.
 */
export class LocalPrivateDocumentStorageAdapter
  implements PrivateDocumentStorageAdapter
{
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = path.resolve(rootPath);
  }

  async saveDocument(
    input: SavePrivateDocumentInput,
  ): Promise<StoredPrivateDocument> {
    const directory = path.join(
      this.root,
      "verifications",
      input.verificationId,
    );
    await mkdir(directory, { recursive: true, mode: 0o750 });

    const filename = `${randomUUID()}.${input.extension}`;
    const absolutePath = path.join(directory, filename);
    await writeFile(absolutePath, input.buffer, { mode: 0o640, flag: "wx" });

    return {
      storageKey: path
        .join("verifications", input.verificationId, filename)
        .split(path.sep)
        .join("/"),
    };
  }

  async readDocument(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveStorageKey(storageKey));
  }

  async deleteDocument(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveStorageKey(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  private resolveStorageKey(storageKey: string): string {
    const absolutePath = path.resolve(this.root, storageKey);
    if (
      absolutePath !== this.root &&
      !absolutePath.startsWith(`${this.root}${path.sep}`)
    ) {
      throw Object.assign(new Error("Invalid storage key."), {
        code: "STORAGE_ERROR",
      });
    }
    return absolutePath;
  }
}
