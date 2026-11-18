import { env } from "../../config/env.js";
import {
  imageStorage,
  publicImageStorage,
} from "../../integrations/storage/index.js";
import {
  ProduceListing,
  ProduceListingImage,
  sequelize,
} from "../../database/models/index.js";
import type { ListingImageData } from "./listings.types.js";
import { validatePublicImageUpload } from "../uploads/public-image.validation.js";
import { deletePublicImageBestEffort } from "../uploads/public-image.cleanup.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildImageData(row: ProduceListingImage): ListingImageData {
  return {
    id: row.id,
    listing_id: row.listing_id,
    image_url: row.image_url,
    public_id: row.public_id ?? null,
    is_primary: row.is_primary ?? false,
    display_order: row.display_order ?? 0,
    created_at: row.created_at!,
  };
}

async function requireListingOwnership(
  userId: string,
  listingId: string,
  transaction?: import("sequelize").Transaction,
): Promise<ProduceListing> {
  const listing = await ProduceListing.findByPk(listingId, {
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!listing) {
    throw Object.assign(new Error("Listing not found."), { code: "NOT_FOUND" });
  }
  if (listing.farmer_user_id !== userId) {
    throw Object.assign(new Error("You do not own this listing."), {
      code: "FORBIDDEN",
    });
  }
  return listing;
}

function assertImageLimit(count: number): void {
  if (count >= env.UPLOAD_MAX_IMAGES_PER_LISTING) {
    throw Object.assign(
      new Error(
        `A listing can have at most ${env.UPLOAD_MAX_IMAGES_PER_LISTING} images.`,
      ),
      { code: "INVALID_OPERATION" },
    );
  }
}

function validateExternalImageUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error("image_url must be a valid URL."), {
      code: "INVALID_OPERATION",
    });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw Object.assign(
      new Error("image_url must use http or https."),
      { code: "INVALID_OPERATION" },
    );
  }

  return parsed.toString();
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function addImageFromUpload(
  userId: string,
  listingId: string,
  file: Express.Multer.File,
): Promise<ListingImageData> {
  const detected = validatePublicImageUpload(file);
  await requireListingOwnership(userId, listingId);

  const stored = await publicImageStorage.saveImage({
    folder: "listings",
    buffer: file.buffer,
    mimeType: detected.mimeType,
    extension: detected.extension,
    ownerId: userId,
  });

  try {
    return await sequelize.transaction(async (transaction) => {
      await requireListingOwnership(userId, listingId, transaction);

      const existingCount = await ProduceListingImage.count({
        where: { listing_id: listingId },
        transaction,
      });
      assertImageLimit(existingCount);

      const image = await ProduceListingImage.create(
        {
          listing_id: listingId,
          image_url: stored.imageUrl,
          storage_key: stored.publicId,
          public_id: stored.publicId,
          is_primary: existingCount === 0,
          display_order: existingCount,
        },
        { transaction },
      );

      return buildImageData(image);
    });
  } catch (err) {
    await deletePublicImageBestEffort(stored.publicId, "listing replacement");
    throw err;
  }
}

/**
 * Attach an externally hosted image URL. This is a development fallback for
 * environments without object storage; uploaded files are preferred.
 */
export async function addImageFromUrl(
  userId: string,
  listingId: string,
  rawUrl: string,
): Promise<ListingImageData> {
  const imageUrl = validateExternalImageUrl(rawUrl);

  return sequelize.transaction(async (transaction) => {
    await requireListingOwnership(userId, listingId, transaction);

    const existingCount = await ProduceListingImage.count({
      where: { listing_id: listingId },
      transaction,
    });
    assertImageLimit(existingCount);

    const image = await ProduceListingImage.create(
      {
        listing_id: listingId,
        image_url: imageUrl,
        storage_key: `dev:${imageUrl}`,
        is_primary: existingCount === 0,
        display_order: existingCount,
      },
      { transaction },
    );

    return buildImageData(image);
  });
}

/**
 * Delete an image from a listing.
 * If the deleted image was the primary, promotes the next image to primary.
 */
export async function deleteImage(
  userId: string,
  listingId: string,
  imageId: string,
): Promise<void> {
  const stored = await sequelize.transaction(async (transaction) => {
    await requireListingOwnership(userId, listingId, transaction);

    const image = await ProduceListingImage.findOne({
      where: { id: imageId, listing_id: listingId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!image) {
      throw Object.assign(new Error("Image not found."), { code: "NOT_FOUND" });
    }

    const wasPrimary = image.is_primary;
    const record = {
      storageKey: image.storage_key,
      publicId: image.public_id,
    };

    await image.destroy({ transaction });

    if (wasPrimary) {
      const next = await ProduceListingImage.findOne({
        where: { listing_id: listingId },
        order: [["display_order", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (next) {
        await next.update({ is_primary: true }, { transaction });
      }
    }

    return record;
  });

  if (stored.publicId) {
    await deletePublicImageBestEffort(stored.publicId, "listing");
  } else if (stored.storageKey && !stored.storageKey.startsWith("dev:")) {
    try {
      await imageStorage.deleteImage(stored.storageKey);
    } catch (error) {
      console.error(
        `[public-image] Failed to delete legacy listing image ${stored.storageKey}:`,
        error,
      );
    }
  }
}

/**
 * Set a specific image as the primary image for a listing.
 * Clears the primary flag on all other images.
 */
export async function setPrimaryImage(
  userId: string,
  listingId: string,
  imageId: string,
): Promise<ListingImageData> {
  return sequelize.transaction(async (transaction) => {
    await requireListingOwnership(userId, listingId, transaction);

    const image = await ProduceListingImage.findOne({
      where: { id: imageId, listing_id: listingId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!image) {
      throw Object.assign(new Error("Image not found."), { code: "NOT_FOUND" });
    }

    await ProduceListingImage.update(
      { is_primary: false },
      { where: { listing_id: listingId }, transaction },
    );
    await image.update({ is_primary: true }, { transaction });

    return buildImageData(image);
  });
}
