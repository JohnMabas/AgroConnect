import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env.js";
import { LocalPublicImageStorage } from "../src/integrations/storage/local-public-image.storage.js";
import type { PublicImageFolder } from "../src/integrations/storage/public-image.storage.interface.js";
import {
  detectImageType,
  validatePublicImageUpload,
} from "../src/modules/uploads/public-image.validation.js";

const cloudinaryMock = vi.hoisted(() => ({
  config: vi.fn(),
  uploadStream: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: cloudinaryMock.config,
    uploader: {
      upload_stream: cloudinaryMock.uploadStream,
      destroy: cloudinaryMock.destroy,
    },
  },
}));

function uploadFile(
  buffer: Buffer,
  originalname = "photo.png",
  mimetype = "image/png",
): Express.Multer.File {
  return { buffer, originalname, mimetype } as Express.Multer.File;
}

function pngBuffer(): Buffer {
  return Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c6360000000020001e221bc330000000049454e44ae426082",
    "hex",
  );
}

function jpegBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(16, 0),
    Buffer.from([0xff, 0xd9]),
  ]);
}

function webpBuffer(): Buffer {
  const buffer = Buffer.alloc(16, 0);
  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");
  return buffer;
}

describe("public image validation", () => {
  it("detects the real file type from magic bytes", () => {
    expect(detectImageType(jpegBuffer())).toEqual({
      mimeType: "image/jpeg",
      extension: "jpg",
    });
    expect(detectImageType(pngBuffer())).toEqual({
      mimeType: "image/png",
      extension: "png",
    });
    expect(detectImageType(webpBuffer())).toEqual({
      mimeType: "image/webp",
      extension: "webp",
    });
  });

  it("rejects unsupported or truncated content with INVALID_IMAGE", () => {
    const gif = Buffer.from("GIF89a000000000000", "ascii");
    expect(detectImageType(gif)).toBeNull();
    expect(() => validatePublicImageUpload(uploadFile(gif, "photo.png"))).toThrow(
      /JPEG, PNG or WebP/,
    );
    expect(() =>
      validatePublicImageUpload(uploadFile(Buffer.from("abc"), "photo.png")),
    ).toThrow();

    try {
      validatePublicImageUpload(uploadFile(gif, "photo.png"));
    } catch (error) {
      expect((error as Error & { code?: string }).code).toBe("INVALID_IMAGE");
    }
  });

  it("enforces the 5 MB limit and requires a file", () => {
    const oversized = Buffer.alloc(env.UPLOAD_MAX_FILE_SIZE_BYTES + 1, 0);
    expect(() => validatePublicImageUpload(uploadFile(oversized))).toThrow(
      /too large/i,
    );
    expect(() => validatePublicImageUpload(undefined)).toThrow(
      /image file is required/i,
    );
  });
});

describe("LocalPublicImageStorage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "agroconnect-images-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes each domain to its own public folder and deletes by public id", async () => {
    const storage = new LocalPublicImageStorage(root, "/uploads");
    const folders: PublicImageFolder[] = [
      "listings",
      "produce",
      "farms",
      "profiles",
    ];

    for (const folder of folders) {
      const stored = await storage.saveImage({
        folder,
        buffer: pngBuffer(),
        mimeType: "image/png",
        extension: "png",
      });

      expect(stored.publicId).toMatch(new RegExp(`^${folder}/`));
      expect(stored.imageUrl).toBe(`/uploads/public/${stored.publicId}`);
      expect((await stat(path.join(root, "public", stored.publicId))).isFile()).toBe(
        true,
      );

      await storage.deleteImage(stored.publicId);
      await expect(
        stat(path.join(root, "public", stored.publicId)),
      ).rejects.toThrow();
    }
  });
});

describe("CloudinaryPublicImageStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cloudinaryMock.uploadStream.mockImplementation(
      (
        _options: unknown,
        callback: (error: unknown, result?: unknown) => void,
      ) => ({
        end: () =>
          callback(null, {
            secure_url:
              "https://res.cloudinary.com/demo/image/upload/v1/agroconnect/profiles/photo.jpg",
            public_id: "agroconnect/profiles/photo",
          }),
        destroy: vi.fn(),
      }),
    );
  });

  it("uploads a public image into the requested agroconnect subfolder", async () => {
    const { CloudinaryPublicImageStorage } = await import(
      "../src/integrations/storage/cloudinary-public-image.storage.js"
    );
    const storage = new CloudinaryPublicImageStorage();

    const stored = await storage.saveImage({
      folder: "profiles",
      buffer: pngBuffer(),
      mimeType: "image/png",
      extension: "png",
    });

    expect(cloudinaryMock.uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: "image",
        type: "upload",
        folder: "agroconnect",
        public_id: expect.stringMatching(/^profiles\/[0-9a-f-]{36}$/),
        overwrite: false,
        timeout: env.CLOUDINARY_UPLOAD_TIMEOUT_MS,
      }),
      expect.any(Function),
    );
    expect(stored).toEqual({
      imageUrl:
        "https://res.cloudinary.com/demo/image/upload/v1/agroconnect/profiles/photo.jpg",
      publicId: "agroconnect/profiles/photo",
    });
  });

  it("deletes a replaced public image by public id and ignores 404s", async () => {
    const { CloudinaryPublicImageStorage } = await import(
      "../src/integrations/storage/cloudinary-public-image.storage.js"
    );
    const storage = new CloudinaryPublicImageStorage();

    await storage.deleteImage("agroconnect/farms/old-photo");
    expect(cloudinaryMock.destroy).toHaveBeenCalledWith(
      "agroconnect/farms/old-photo",
      { resource_type: "image", type: "upload", invalidate: true },
    );

    cloudinaryMock.destroy.mockRejectedValueOnce({ http_code: 404 });
    await expect(
      storage.deleteImage("agroconnect/farms/missing"),
    ).resolves.toBeUndefined();
  });

  it("rejects with UPLOAD_TIMEOUT when Cloudinary never calls back", async () => {
    const destroy = vi.fn();
    cloudinaryMock.uploadStream.mockImplementation(() => ({
      end: vi.fn(),
      destroy,
    }));
    const { CloudinaryPublicImageStorage } = await import(
      "../src/integrations/storage/cloudinary-public-image.storage.js"
    );
    const storage = new CloudinaryPublicImageStorage();

    vi.useFakeTimers();
    try {
      const pending = storage.saveImage({
        folder: "listings",
        buffer: pngBuffer(),
        mimeType: "image/png",
        extension: "png",
      });
      const assertion = expect(pending).rejects.toMatchObject({
        code: "UPLOAD_TIMEOUT",
      });
      await vi.advanceTimersByTimeAsync(env.CLOUDINARY_UPLOAD_TIMEOUT_MS);
      await assertion;
      expect(destroy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the uploaded bytes available to the local adapter", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agroconnect-upload-"));
    try {
      const storage = new LocalPublicImageStorage(root, "/uploads");
      const stored = await storage.saveImage({
        folder: "listings",
        buffer: webpBuffer(),
        mimeType: "image/webp",
        extension: "webp",
      });
      expect(await readFile(path.join(root, "public", stored.publicId))).toEqual(
        webpBuffer(),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
