import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  PublicImageStorageAdapter,
  SavePublicImageInput,
  StoredPublicImage,
} from "./public-image.storage.interface.js";

export class LocalPublicImageStorage implements PublicImageStorageAdapter {
  private readonly root: string;
  private readonly publicPrefix: string;

  constructor(rootPath: string, publicPrefix = "/uploads") {
    this.root = path.resolve(rootPath);
    this.publicPrefix = `/${publicPrefix.replace(/^\/+|\/+$/g, "")}`;
  }

  async saveImage(input: SavePublicImageInput): Promise<StoredPublicImage> {
    const publicId = `${input.folder}/${randomUUID()}.${input.extension}`;
    const absolutePath = path.resolve(this.root, "public", publicId);
    await mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o750 });
    await writeFile(absolutePath, input.buffer, { mode: 0o640, flag: "wx" });

    return {
      imageUrl: `${this.publicPrefix}/public/${publicId}`,
      publicId,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    const absolutePath = path.resolve(this.root, "public", publicId);
    const publicRoot = path.resolve(this.root, "public");

    if (
      absolutePath !== publicRoot &&
      !absolutePath.startsWith(`${publicRoot}${path.sep}`)
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
