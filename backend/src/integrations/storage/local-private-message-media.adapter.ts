import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SavePrivateMessageMediaInput {
  conversationId: string;
  messageId: string;
  buffer: Buffer;
  extension: string;
}

export interface StoredPrivateMessageMedia {
  storageKey: string;
}

export interface PrivateMessageMediaStorageAdapter {
  saveMedia(input: SavePrivateMessageMediaInput): Promise<StoredPrivateMessageMedia>;
  readMedia(storageKey: string): Promise<Buffer>;
  deleteMedia(storageKey: string): Promise<void>;
}

export class LocalPrivateMessageMediaStorageAdapter
  implements PrivateMessageMediaStorageAdapter
{
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = path.resolve(rootPath);
  }

  async saveMedia(
    input: SavePrivateMessageMediaInput,
  ): Promise<StoredPrivateMessageMedia> {
    const relativeDir = path.join(
      "messages",
      input.conversationId,
      input.messageId,
    );
    const directory = path.join(this.root, relativeDir);
    await mkdir(directory, { recursive: true, mode: 0o750 });

    const filename = `${randomUUID()}.${input.extension}`;
    const absolutePath = path.join(directory, filename);
    await writeFile(absolutePath, input.buffer, { mode: 0o640, flag: "wx" });

    return {
      storageKey: path.join(relativeDir, filename).split(path.sep).join("/"),
    };
  }

  async readMedia(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveStorageKey(storageKey));
  }

  async deleteMedia(storageKey: string): Promise<void> {
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
