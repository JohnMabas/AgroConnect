import { QueryTypes } from "sequelize";
import {
  sequelize,
  ProduceListing,
  InventoryAdjustment,
} from "../../database/models/index.js";
import type { AdjustmentInput } from "./listings.validation.js";
import type {
  InventoryAdjustmentData,
  InventorySummary,
  PaginatedAdjustments,
} from "./listings.types.js";
import {
  addDecimal,
  normalizeDecimal,
  subtractDecimal,
} from "./decimal.js";

const QUANTITY_SCALE = 3;

interface AdjustmentRow {
  id: string;
  listing_id: string;
  farmer_user_id: string;
  adjustment_type: "stock_added" | "stock_removed" | "correction";
  quantity_change: string;
  previous_available_quantity: string;
  new_available_quantity: string;
  reason: string | null;
  created_at: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAdjustmentData(
  row: InventoryAdjustment | AdjustmentRow,
): InventoryAdjustmentData {
  return {
    id: row.id,
    listing_id: row.listing_id,
    farmer_user_id: row.farmer_user_id,
    adjustment_type: row.adjustment_type,
    quantity_change: Number(row.quantity_change),
    previous_available_quantity: Number(row.previous_available_quantity),
    new_available_quantity: Number(row.new_available_quantity),
    reason: row.reason ?? null,
    created_at: row.created_at,
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

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Return a summary of the inventory for the given listing.
 */
export async function getInventory(
  userId: string,
  listingId: string,
): Promise<InventorySummary> {
  const listing = await requireListingOwnership(userId, listingId);

  const quantity = normalizeDecimal(listing.quantity, QUANTITY_SCALE);
  const available = normalizeDecimal(
    listing.available_quantity,
    QUANTITY_SCALE,
  );
  const reserved = normalizeDecimal(
    listing.reserved_quantity,
    QUANTITY_SCALE,
  );
  const sold = normalizeDecimal(listing.sold_quantity, QUANTITY_SCALE);

  const expectedTotal = addDecimal(
    addDecimal(available, reserved, QUANTITY_SCALE),
    sold,
    QUANTITY_SCALE,
  );

  return {
    listing_id: listing.id,
    title: listing.title,
    status: listing.status ?? "draft",
    quantity: Number(quantity),
    available_quantity: Number(available),
    reserved_quantity: Number(reserved),
    sold_quantity: Number(sold),
    unit: listing.unit ?? "kg",
    is_balanced: quantity === expectedTotal,
  };
}

/**
 * Create an inventory adjustment, updating the listing quantities atomically.
 *
 * Uses SELECT ... FOR UPDATE (without SKIP LOCKED) so concurrent adjustments
 * are serialized and each one sees the previous adjustment's committed state.
 * All quantity arithmetic is performed with fixed-point strings and PostgreSQL
 * NUMERIC values, never JavaScript floating-point arithmetic.
 */
export async function createAdjustment(
  userId: string,
  listingId: string,
  data: AdjustmentInput,
): Promise<InventoryAdjustmentData> {
  return sequelize.transaction(async (transaction) => {
    const listing = await requireListingOwnership(userId, listingId, transaction);

    const previous = normalizeDecimal(
      listing.available_quantity,
      QUANTITY_SCALE,
    );
    const requested = normalizeDecimal(
      data.quantity_change,
      QUANTITY_SCALE,
    );

    let newAvailable: string;
    let delta: string;

    switch (data.adjustment_type) {
      case "stock_added": {
        if (Number(requested) <= 0) {
          throw Object.assign(
            new Error("quantity_change must be greater than zero for stock_added."),
            { code: "INVALID_OPERATION" },
          );
        }
        newAvailable = addDecimal(previous, requested, QUANTITY_SCALE);
        delta = requested;
        break;
      }

      case "stock_removed": {
        if (Number(requested) <= 0) {
          throw Object.assign(
            new Error("quantity_change must be greater than zero for stock_removed."),
            { code: "INVALID_OPERATION" },
          );
        }
        newAvailable = subtractDecimal(previous, requested, QUANTITY_SCALE);
        if (newAvailable.startsWith("-")) {
          throw Object.assign(
            new Error(
              `Cannot remove ${requested} units — only ${previous} are available.`,
            ),
            { code: "INVALID_OPERATION" },
          );
        }
        delta = `-${requested}`;
        break;
      }

      case "correction": {
        // For corrections, quantity_change is the desired available quantity.
        newAvailable = requested;
        delta = subtractDecimal(
          newAvailable,
          previous,
          QUANTITY_SCALE,
        );
        break;
      }

      default:
        throw Object.assign(
          new Error("Invalid adjustment_type."),
          { code: "INVALID_OPERATION" },
        );
    }

    const updatedRows = await sequelize.query<{
      available_quantity: string;
      quantity: string;
    }>(
      `UPDATE produce_listings
       SET available_quantity = :newAvailable::numeric,
           quantity = :newAvailable::numeric + reserved_quantity + sold_quantity,
           status = CASE
             WHEN :newAvailable::numeric = 0 AND status = 'published' THEN 'sold_out'
             WHEN :newAvailable::numeric > 0 AND status = 'sold_out' THEN 'published'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = :listingId
         AND :newAvailable::numeric >= 0
       RETURNING available_quantity, quantity`,
      {
        replacements: { newAvailable, listingId },
        transaction,
        type: QueryTypes.SELECT,
      },
    );

    if (updatedRows.length === 0) {
      throw Object.assign(
        new Error("The adjustment could not be applied to this listing."),
        { code: "INVALID_OPERATION" },
      );
    }

    const inserted = await sequelize.query<AdjustmentRow>(
      `INSERT INTO inventory_adjustments
         (id, listing_id, farmer_user_id, adjustment_type, quantity_change,
          previous_available_quantity, new_available_quantity, reason, created_at)
       VALUES
         (gen_random_uuid(), :listingId, :userId, :adjustmentType,
          :delta::numeric, :previous::numeric, :newAvailable::numeric,
          :reason, NOW())
       RETURNING *`,
      {
        replacements: {
          listingId,
          userId,
          adjustmentType: data.adjustment_type,
          delta,
          previous,
          newAvailable,
          reason: data.reason ?? null,
        },
        transaction,
        type: QueryTypes.SELECT,
      },
    );

    const adjustment = inserted[0];
    if (!adjustment) {
      throw new Error("The inventory adjustment could not be recorded.");
    }

    return buildAdjustmentData(adjustment);
  });
}

/**
 * Return paginated inventory adjustments for the given listing.
 */
export async function getAdjustments(
  userId: string,
  listingId: string,
  page: number,
  limit: number,
): Promise<PaginatedAdjustments> {
  await requireListingOwnership(userId, listingId);

  const offset = (page - 1) * limit;

  const { count, rows } = await InventoryAdjustment.findAndCountAll({
    where: { listing_id: listingId },
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    adjustments: rows.map(buildAdjustmentData),
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
  };
}
