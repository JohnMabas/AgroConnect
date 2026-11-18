import { randomUUID } from "node:crypto";
import { accessSync, createReadStream } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
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
}

export class LocalStorageService implements StorageService {
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = path.resolve(rootPath);
  }

  async save(
    key: string,
    body: Buffer,
    mimeType: string,
    _options?: StorageSaveOptions,
  ): Promise<StorageSaveResult> {
    const absolutePath = this.resolveKey(key, "write");
    await mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o750 });
    await writeFile(absolutePath, body, { mode: 0o640 });
    return { key, mimeType, size: body.length };
  }

  async getStream(
    key: string,
    range?: StorageRange,
    _options?: StorageObjectMeta,
  ): Promise<StorageStreamResult> {
    const absolutePath = this.resolveKey(key, "read");
    let fileStat;
    try {
      fileStat = await stat(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw Object.assign(new Error("Attachment file is unavailable."), {
          code: "STORAGE_NOT_FOUND",
        });
      }
      throw error;
    }
    const total = fileStat.size;

    if (range) {
      const start = Math.max(0, Math.min(range.start, Math.max(total - 1, 0)));
      const end = Math.max(
        start,
        Math.min(range.end ?? total - 1, Math.max(total - 1, 0)),
      );
      const stream = createReadStream(absolutePath, { start, end });
      return {
        stream,
        contentLength: total > 0 ? end - start + 1 : 0,
        totalSize: total,
        acceptsRanges: true,
        range: { start, end, total },
      };
    }

    return {
      stream: createReadStream(absolutePath),
      contentLength: total,
      totalSize: total,
      acceptsRanges: true,
    };
  }

  async exists(key: string, _options?: StorageObjectMeta): Promise<boolean> {
    try {
      await stat(this.resolveKey(key, "read"));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  async delete(key: string, _options?: StorageObjectMeta): Promise<void> {
    try {
      await unlink(this.resolveKey(key, "read"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async saveMedia(
    input: SavePrivateMessageMediaInput,
  ): Promise<StoredPrivateMessageMedia> {
    const relativeDir = path
      .join("messages", input.conversationId, input.messageId)
      .split(path.sep)
      .join("/");
    const filename = `${randomUUID()}.${input.extension}`;
    const key = `${relativeDir}/${filename}`;
    const absolutePath = this.resolveKey(key, "write");
    await mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o750 });
    await writeFile(absolutePath, input.buffer, { mode: 0o640, flag: "wx" });
    return { storageKey: key };
  }

  async readMedia(storageKey: string): Promise<Buffer> {
    try {
      return await readFile(this.resolveKey(storageKey, "read"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw Object.assign(new Error("Attachment file is unavailable."), {
          code: "STORAGE_NOT_FOUND",
        });
      }
      throw error;
    }
  }

  async deleteMedia(storageKey: string): Promise<void> {
    await this.delete(storageKey);
  }

  /**
   * Resolve a storage key to an absolute path under the local root.
   *
   * Compatibility: legacy keys may include "messages/..." while the configured
   * root already ends with "/messages", which previously produced a doubled
   * "messages/messages/..." path on disk. Reads fall back across compatible
   * candidate paths so existing stored keys remain downloadable without DB
   * rewrites. Writes avoid creating new doubled segments.
   */
  private resolveKey(key: string, mode: "read" | "write"): string {
    const normalized = key.replace(/^[/\\]+/, "").replace(/\\/g, "/");
    if (
      !normalized ||
      normalized.includes("\0") ||
      normalized.split("/").includes("..")
    ) {
      throw Object.assign(new Error("Invalid storage key."), {
        code: "STORAGE_ERROR",
      });
    }

    const candidates = this.candidatePaths(normalized, mode);
    if (mode === "read") {
      for (const candidate of candidates) {
        try {
          accessSync(candidate);
          return candidate;
        } catch {
          // try next compatible candidate
        }
      }
      return candidates[0]!;
    }

    return candidates[0]!;
  }

  private candidatePaths(normalized: string, mode: "read" | "write"): string[] {
    const root = this.root;
    const base = path.basename(root);
    const out: string[] = [];

    const push = (p: string) => {
      const abs = path.resolve(p);
      if (abs === root || abs.startsWith(`${root}${path.sep}`)) {
        if (!out.includes(abs)) out.push(abs);
      }
    };

    if (base === "messages" && normalized.startsWith("messages/")) {
      const stripped = normalized.slice("messages/".length);
      // Prefer non-doubled path for both read resolution and all new writes.
      push(path.join(root, stripped));
      if (mode === "read") {
        // Legacy doubled path: root (.../messages) + key (messages/...) => messages/messages/...
        push(path.join(root, normalized));
        // Legacy path relative to parent of root.
        push(path.join(path.dirname(root), normalized));
      }
    } else {
      push(path.join(root, normalized));
      if (mode === "read" && base !== "messages") {
        push(path.join(root, "messages", normalized));
      }
    }

    if (out.length === 0) {
      throw Object.assign(new Error("Invalid storage key."), {
        code: "STORAGE_ERROR",
      });
    }
    return out;
  }
}
