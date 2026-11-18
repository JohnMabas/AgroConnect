import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";
import type {
  PublicImageStorageAdapter,
  SavePublicImageInput,
  StoredPublicImage,
} from "./public-image.storage.interface.js";

interface CloudinaryUploadResult {
  secure_url?: string;
  public_id?: string;
}

interface CloudinaryErrorShape {
  http_code?: number;
  error?: { http_code?: number };
}

export class CloudinaryPublicImageStorage implements PublicImageStorageAdapter {
  private configured = false;

  private ensureConfigured(): void {
    if (this.configured) return;
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    this.configured = true;
  }

  async saveImage(input: SavePublicImageInput): Promise<StoredPublicImage> {
    this.ensureConfigured();
    const uploadPublicId = `${input.folder}/${randomUUID()}`;

    const result = await new Promise<CloudinaryUploadResult | undefined>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          type: "upload",
          folder: env.CLOUDINARY_PUBLIC_FOLDER,
          public_id: uploadPublicId,
          overwrite: false,
          use_filename: false,
          unique_filename: false,
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        },
      );
      stream.end(input.buffer);
    });

    const secureUrl = typeof result?.secure_url === "string" ? result.secure_url : "";
    const publicId = typeof result?.public_id === "string" ? result.public_id : "";

    if (!secureUrl || !publicId) {
      throw new Error("Cloudinary upload did not return a public image URL.");
    }

    return { imageUrl: secureUrl, publicId };
  }

  async deleteImage(publicId: string): Promise<void> {
    this.ensureConfigured();
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        type: "upload",
        invalidate: true,
      });
    } catch (error: unknown) {
      const cloudinaryError = error as CloudinaryErrorShape;
      const status = cloudinaryError.http_code ?? cloudinaryError.error?.http_code;
      if (status === 404) return;
      throw error;
    }
  }
}
