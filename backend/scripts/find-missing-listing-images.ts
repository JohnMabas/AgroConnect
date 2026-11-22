import { access } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import "../src/config/env.js";
import { env } from "../src/config/env.js";
import { ProduceListingImage } from "../src/database/models/index.js";
import { sequelize } from "../src/database/sequelize.js";

function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    }, timeoutMs);

    work.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function cloudinaryAssetExists(publicId: string): Promise<boolean> {
  try {
    await withTimeout(
      cloudinary.api.resource(publicId, {
        resource_type: "image",
        type: "upload",
      }),
      env.CLOUDINARY_DELETE_TIMEOUT_MS,
      "Cloudinary existence check timed out.",
    );
    return true;
  } catch (error) {
    const status =
      typeof error === "object" && error !== null
        ? ((error as { http_code?: number; error?: { http_code?: number } }).http_code ??
          (error as { error?: { http_code?: number } }).error?.http_code)
        : undefined;
    if (status === 404) return false;
    throw error;
  }
}

async function localFileExists(storageKey: string): Promise<boolean> {
  const absolutePath = path.resolve(env.UPLOAD_STORAGE_PATH, storageKey);
  const root = path.resolve(env.UPLOAD_STORAGE_PATH);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    return false;
  }
  try {
    await access(absolutePath);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw error;
  }
}

async function main(): Promise<void> {
  await sequelize.authenticate();

  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are required to check public images.");
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const rows = await ProduceListingImage.findAll({
    attributes: ["id", "listing_id", "image_url", "storage_key", "public_id", "created_at"],
    order: [["created_at", "ASC"]],
  });

  let missingCount = 0;
  let skippedExternalCount = 0;

  for (const row of rows) {
    const publicId = row.public_id ?? null;
    const storageKey = row.storage_key ?? null;
    const imageUrl = row.image_url ?? "";

    if (publicId) {
      let found = false;
      let reason: string | null = null;
      try {
        found = await cloudinaryAssetExists(publicId);
      } catch (error) {
        reason = `exists_check_error:${safeMessage(error)}`;
      }

      if (!found) {
        missingCount += 1;
        console.log(JSON.stringify({
          id: row.id,
          listing_id: row.listing_id,
          image_url: imageUrl,
          public_id: publicId,
          storage_key: storageKey,
          reason: reason ?? "cloudinary_not_found",
        }));
      }
      continue;
    }

    if (storageKey?.startsWith("dev:") || /^https?:\/\//i.test(imageUrl)) {
      skippedExternalCount += 1;
      continue;
    }

    if (storageKey && imageUrl.startsWith("/uploads/")) {
      let found = false;
      let reason: string | null = null;
      try {
        found = await localFileExists(storageKey);
      } catch (error) {
        reason = `exists_check_error:${safeMessage(error)}`;
      }

      if (!found) {
        missingCount += 1;
        console.log(JSON.stringify({
          id: row.id,
          listing_id: row.listing_id,
          image_url: imageUrl,
          storage_key: storageKey,
          reason: reason ?? "legacy_file_missing",
        }));
      }
      continue;
    }

    skippedExternalCount += 1;
  }

  console.log(
    JSON.stringify({
      scanned: rows.length,
      missing: missingCount,
      skipped_external: skippedExternalCount,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error("find-missing-listing-images failed:", safeMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (error) {
      console.error("find-missing-listing-images close failed:", safeMessage(error));
    }
  });
