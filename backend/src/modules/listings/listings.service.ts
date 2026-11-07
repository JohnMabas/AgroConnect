import { Op, type Includeable, type Order, type Transaction } from "sequelize";
import {
  FarmerProfile,
  InventoryAdjustment,
  ProduceListing,
  ProduceType,
  ProduceCategory,
  ProduceListingImage,
  User,
  sequelize,
} from "../../database/models/index.js";
import type { CreateListingInput, UpdateListingInput } from "./listings.validation.js";
import type {
  ListingData,
  ListingImageData,
  ListingStatus,
  PaginatedListings,
  PublicFarmerData,
} from "./listings.types.js";
import { normalizeDecimal, subtractDecimal } from "./decimal.js";

const QUANTITY_SCALE = 3;

export interface ListingViewer {
  userId: string;
  roles: string[];
}

type ProduceTypeRow = ProduceType & { category?: ProduceCategory };

type ListingRow = ProduceListing & {
  produce_type?: ProduceTypeRow;
  farmer?: User;
  images?: ProduceListingImage[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isPastDate(value: string | null): boolean {
  return value !== null && value < todayIsoDate();
}

function buildImageData(row: ProduceListingImage): ListingImageData {
  return {
    id: row.id,
    listing_id: row.listing_id,
    image_url: row.image_url,
    is_primary: row.is_primary ?? false,
    display_order: row.display_order ?? 0,
    created_at: row.created_at!,
  };
}

function buildFarmerData(row?: User): PublicFarmerData | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    display_name: row.display_name ?? null,
  };
}

function isCurrentlyAvailable(row: {
  status?: string | null;
  available_quantity?: number | string | null;
  available_from?: string | null;
  expiry_date?: string | null;
}): boolean {
  const status = row.status ?? "draft";
  const available = Number(row.available_quantity ?? 0);
  if (status !== "published" || available <= 0) return false;

  const today = todayIsoDate();
  if (row.available_from && row.available_from > today) return false;
  if (row.expiry_date && row.expiry_date < today) return false;
  return true;
}

function buildListingData(row: ListingRow): ListingData {
  const produceType = row.produce_type
    ? {
        id: row.produce_type.id,
        category_id: row.produce_type.category_id,
        name: row.produce_type.name,
        slug: row.produce_type.slug,
        description: row.produce_type.description ?? null,
        image_url: row.produce_type.image_url ?? null,
        is_active: row.produce_type.is_active ?? true,
        category: row.produce_type.category
          ? {
              id: row.produce_type.category.id,
              name: row.produce_type.category.name,
              slug: row.produce_type.category.slug,
              description: row.produce_type.category.description ?? null,
              is_active: row.produce_type.category.is_active ?? true,
              created_at: row.produce_type.category.created_at!,
              updated_at: row.produce_type.category.updated_at!,
            }
          : undefined,
        created_at: row.produce_type.created_at!,
        updated_at: row.produce_type.updated_at!,
      }
    : undefined;

  return {
    id: row.id,
    farmer_user_id: row.farmer_user_id,
    produce_type_id: row.produce_type_id,
    title: row.title,
    description: row.description ?? null,
    variety: row.variety ?? null,
    grade: row.grade ?? null,
    quantity: Number(row.quantity),
    available_quantity: Number(row.available_quantity ?? 0),
    reserved_quantity: Number(row.reserved_quantity ?? 0),
    sold_quantity: Number(row.sold_quantity ?? 0),
    unit: row.unit ?? "kg",
    packaging_description: row.packaging_description ?? null,
    price_per_unit: Number(row.price_per_unit),
    currency: row.currency ?? "NGN",
    country: row.country ?? null,
    state_or_region: row.state_or_region ?? null,
    local_government_area: row.local_government_area ?? null,
    community: row.community ?? null,
    collection_location: row.collection_location ?? null,
    harvest_date: row.harvest_date ?? null,
    available_from: row.available_from ?? null,
    expiry_date: row.expiry_date ?? null,
    status: (row.status ?? "draft") as ListingStatus,
    is_available: isCurrentlyAvailable(row),
    produce_type: produceType,
    farmer: buildFarmerData(row.farmer),
    images: row.images?.map(buildImageData),
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

const listingIncludes: Includeable[] = [
  {
    model: ProduceType,
    as: "produce_type",
    include: [{ model: ProduceCategory, as: "category" }],
  },
  { model: User, as: "farmer", attributes: ["id", "display_name"] },
  {
    model: ProduceListingImage,
    as: "images",
    separate: true,
    order: [
      ["is_primary", "DESC"],
      ["display_order", "ASC"],
      ["created_at", "ASC"],
    ] as Order,
  },
];

async function expireIfNeeded(
  listing: ProduceListing,
  transaction?: Transaction,
): Promise<void> {
  if (
    (listing.status === "published" || listing.status === "paused") &&
    isPastDate(listing.expiry_date)
  ) {
    await listing.update(
      { status: "expired" },
      transaction ? { transaction } : undefined,
    );
  }
}

async function expirePastPublishedListings(userId?: string): Promise<void> {
  const where: Record<string, unknown> = {
    status: { [Op.in]: ["published", "paused"] },
    expiry_date: { [Op.lt]: todayIsoDate() },
  };
  if (userId) where.farmer_user_id = userId;
  await ProduceListing.update({ status: "expired" }, { where });
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Create a new produce listing as a draft. The user must have a farmer profile.
 */
export async function createListing(
  userId: string,
  data: CreateListingInput,
): Promise<ListingData> {
  const farmerProfile = await FarmerProfile.findOne({ where: { user_id: userId } });
  if (!farmerProfile) {
    throw Object.assign(
      new Error("You must create a farmer profile before listing produce."),
      { code: "FORBIDDEN" },
    );
  }

  const produceType = (await ProduceType.findOne({
    where: { id: data.produce_type_id },
    include: [{ model: ProduceCategory, as: "category" }],
  })) as ProduceTypeRow | null;
  if (!produceType) {
    throw Object.assign(new Error("Produce type not found."), { code: "NOT_FOUND" });
  }
  if (!produceType.is_active) {
    throw Object.assign(
      new Error("The selected produce type is no longer available."),
      { code: "INVALID_OPERATION" },
    );
  }
  if (produceType.category && !produceType.category.is_active) {
    throw Object.assign(
      new Error("The selected produce category is no longer available."),
      { code: "INVALID_OPERATION" },
    );
  }

  const quantity = normalizeDecimal(data.quantity, QUANTITY_SCALE);

  const listing = await ProduceListing.create({
    farmer_user_id: userId,
    produce_type_id: data.produce_type_id,
    title: data.title,
    description: data.description ?? null,
    variety: data.variety ?? null,
    grade: data.grade ?? null,
    quantity: quantity as unknown as number,
    available_quantity: quantity as unknown as number,
    reserved_quantity: 0,
    sold_quantity: 0,
    unit: data.unit,
    packaging_description: data.packaging_description ?? null,
    price_per_unit: data.price_per_unit,
    currency: data.currency ?? "NGN",
    country: data.country ?? null,
    state_or_region: data.state_or_region ?? null,
    local_government_area: data.local_government_area ?? null,
    community: data.community ?? null,
    collection_location: data.collection_location ?? null,
    harvest_date: data.harvest_date ?? null,
    available_from: data.available_from ?? null,
    expiry_date: data.expiry_date ?? null,
    status: "draft",
  });

  const created = await ProduceListing.findByPk(listing.id, {
    include: listingIncludes,
  });
  return buildListingData(created as ListingRow);
}

/**
 * Get the authenticated user's listings, paginated.
 */
export async function getMyListings(
  userId: string,
  page: number,
  limit: number,
): Promise<PaginatedListings> {
  await expirePastPublishedListings(userId);
  const offset = (page - 1) * limit;

  const { count, rows } = await ProduceListing.findAndCountAll({
    where: { farmer_user_id: userId },
    include: listingIncludes,
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    listings: rows.map((r) => buildListingData(r as ListingRow)),
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
  };
}

export interface PublicListingFilters {
  page: number;
  limit: number;
  search?: string;
  categorySlug?: string;
  produceTypeId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  currency?: string;
  sort:
    | "newest"
    | "price_asc"
    | "price_desc"
    | "quantity_asc"
    | "quantity_desc";
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * List published, currently available listings for public discovery.
 * Supports search, category/type/location/price filters and pagination.
 */
export async function listPublishedListings(
  filters: PublicListingFilters,
): Promise<PaginatedListings> {
  await expirePastPublishedListings();

  const today = todayIsoDate();
  const conditions: Array<Record<string | symbol, unknown>> = [
    {
      [Op.or]: [
        { available_from: null },
        { available_from: { [Op.lte]: today } },
      ],
    },
    {
      [Op.or]: [{ expiry_date: null }, { expiry_date: { [Op.gte]: today } }],
    },
  ];

  if (filters.search) {
    const term = `%${escapeLike(filters.search)}%`;
    conditions.push({
      [Op.or]: [
        { title: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
        { variety: { [Op.iLike]: term } },
        { "$produce_type.name$": { [Op.iLike]: term } },
        { "$produce_type.category.name$": { [Op.iLike]: term } },
      ],
    });
  }

  if (filters.location) {
    const location = `%${escapeLike(filters.location)}%`;
    conditions.push({
      [Op.or]: [
        { country: { [Op.iLike]: location } },
        { state_or_region: { [Op.iLike]: location } },
        { local_government_area: { [Op.iLike]: location } },
        { community: { [Op.iLike]: location } },
      ],
    });
  }

  const where: Record<string | symbol, unknown> = {
    status: "published",
    available_quantity: { [Op.gt]: 0 },
    [Op.and]: conditions,
  };

  if (filters.categorySlug) {
    where["$produce_type.category.slug$"] = filters.categorySlug;
  }
  if (filters.produceTypeId) {
    where.produce_type_id = filters.produceTypeId;
  }
  if (filters.minPrice !== undefined) {
    where.price_per_unit = { [Op.gte]: filters.minPrice };
  }
  if (filters.maxPrice !== undefined) {
    where.price_per_unit = {
      ...(where.price_per_unit as Record<symbol, number> | undefined),
      [Op.lte]: filters.maxPrice,
    };
  }
  if (filters.minQuantity !== undefined) {
    where.available_quantity = {
      [Op.gt]: 0,
      [Op.gte]: filters.minQuantity,
    };
  }
  if (filters.maxQuantity !== undefined) {
    where.available_quantity = {
      ...(where.available_quantity as Record<symbol, number> | undefined),
      [Op.lte]: filters.maxQuantity,
    };
  }
  if (filters.currency) {
    where.currency = filters.currency;
  }

  const order: Array<[string, "ASC" | "DESC"]> =
    filters.sort === "price_asc"
      ? [["price_per_unit", "ASC"]]
      : filters.sort === "price_desc"
        ? [["price_per_unit", "DESC"]]
        : filters.sort === "quantity_asc"
          ? [["available_quantity", "ASC"]]
          : filters.sort === "quantity_desc"
            ? [["available_quantity", "DESC"]]
            : [["created_at", "DESC"]];

  const { count, rows } = await ProduceListing.findAndCountAll({
    where,
    include: listingIncludes,
    order,
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
    subQuery: false,
  });

  return {
    listings: rows.map((row) => buildListingData(row as ListingRow)),
    total: count,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(count / filters.limit),
  };
}

/**
 * Get a single listing by ID.
 *
 * Public callers can read non-draft listings. Drafts are only visible to their
 * owner (or an administrator). Closed and expired listings remain viewable as
 * historical records but report `is_available = false`.
 */
export async function getListingById(
  id: string,
  viewer?: ListingViewer,
): Promise<ListingData> {
  const listing = await ProduceListing.findOne({
    where: { id },
    include: listingIncludes,
  });

  if (!listing) {
    throw Object.assign(new Error("Listing not found."), { code: "NOT_FOUND" });
  }

  await expireIfNeeded(listing);

  const isOwner = viewer?.userId === listing.farmer_user_id;
  const isAdmin = viewer?.roles.includes("admin") ?? false;

  if (listing.status === "draft" && !isOwner && !isAdmin) {
    throw Object.assign(new Error("Listing not found."), { code: "NOT_FOUND" });
  }

  return buildListingData(listing as ListingRow);
}

/**
 * Update a listing. Only draft and paused listings can be edited.
 * The row is locked for the duration of the update to keep the inventory
 * invariant consistent under concurrent requests.
 */
export async function updateListing(
  userId: string,
  id: string,
  data: UpdateListingInput,
): Promise<ListingData> {
  await sequelize.transaction(async (transaction) => {
    const listing = await ProduceListing.findOne({
      where: { id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!listing) {
      throw Object.assign(new Error("Listing not found."), { code: "NOT_FOUND" });
    }

    if (listing.farmer_user_id !== userId) {
      throw Object.assign(new Error("You do not own this listing."), {
        code: "FORBIDDEN",
      });
    }

    await expireIfNeeded(listing, transaction);

    if (listing.status !== "draft" && listing.status !== "paused") {
      throw Object.assign(
        new Error(
          "Listing can only be updated when it is in draft or paused status.",
        ),
        { code: "INVALID_OPERATION" },
      );
    }

    if (data.produce_type_id && data.produce_type_id !== listing.produce_type_id) {
      const produceType = (await ProduceType.findOne({
        where: { id: data.produce_type_id },
        include: [{ model: ProduceCategory, as: "category" }],
        transaction,
      })) as ProduceTypeRow | null;
      if (!produceType) {
        throw Object.assign(new Error("Produce type not found."), {
          code: "NOT_FOUND",
        });
      }
      if (
        !produceType.is_active ||
        (produceType.category && !produceType.category.is_active)
      ) {
        throw Object.assign(
          new Error("The selected produce type is no longer available."),
          { code: "INVALID_OPERATION" },
        );
      }
    }

    const updatePayload: Record<string, unknown> = { ...data };

    if (data.quantity !== undefined) {
      const quantity = normalizeDecimal(data.quantity, QUANTITY_SCALE);
      const reserved = normalizeDecimal(listing.reserved_quantity, QUANTITY_SCALE);
      const sold = normalizeDecimal(listing.sold_quantity, QUANTITY_SCALE);
      const available = subtractDecimal(
        subtractDecimal(quantity, reserved, QUANTITY_SCALE),
        sold,
        QUANTITY_SCALE,
      );

      if (available.startsWith("-")) {
        throw Object.assign(
          new Error(
            "New quantity cannot be lower than the reserved plus sold quantity.",
          ),
          { code: "INVALID_OPERATION" },
        );
      }

      updatePayload.quantity = quantity;
      updatePayload.available_quantity = available;
    }

    await listing.update(updatePayload as unknown as Partial<ProduceListing>, {
      transaction,
    });
  });

  return getListingById(id, { userId, roles: [] });
}

// ─── Status transitions ───────────────────────────────────────────────────────

async function withOwnedListing(
  userId: string,
  id: string,
  handler: (
    listing: ProduceListing,
    transaction: Transaction,
  ) => Promise<void> | void,
): Promise<void> {
  await sequelize.transaction(async (transaction) => {
    const listing = await ProduceListing.findOne({
      where: { id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!listing) {
      throw Object.assign(new Error("Listing not found."), { code: "NOT_FOUND" });
    }
    if (listing.farmer_user_id !== userId) {
      throw Object.assign(new Error("You do not own this listing."), {
        code: "FORBIDDEN",
      });
    }

    await expireIfNeeded(listing, transaction);
    await handler(listing, transaction);
  });
}

async function assertPublishable(listing: ProduceListing): Promise<void> {
  if (!listing.title || listing.title.trim().length < 3) {
    throw Object.assign(
      new Error("A valid title is required before publishing."),
      { code: "INVALID_OPERATION" },
    );
  }
  if (!listing.unit) {
    throw Object.assign(new Error("A unit is required before publishing."), {
      code: "INVALID_OPERATION",
    });
  }
  if (Number(listing.quantity) <= 0 || Number(listing.available_quantity) <= 0) {
    throw Object.assign(
      new Error("Listing must have available quantity greater than zero."),
      { code: "INVALID_OPERATION" },
    );
  }
  if (Number(listing.price_per_unit) < 0) {
    throw Object.assign(
      new Error("Listing price cannot be negative."),
      { code: "INVALID_OPERATION" },
    );
  }
  if (isPastDate(listing.expiry_date)) {
    throw Object.assign(
      new Error("Listing expiry date has already passed."),
      { code: "INVALID_OPERATION" },
    );
  }

  const produceType = (await ProduceType.findOne({
    where: { id: listing.produce_type_id },
    include: [{ model: ProduceCategory, as: "category" }],
  })) as ProduceTypeRow | null;
  if (
    !produceType ||
    !produceType.is_active ||
    (produceType.category && !produceType.category.is_active)
  ) {
    throw Object.assign(
      new Error("The selected produce type is no longer available."),
      { code: "INVALID_OPERATION" },
    );
  }
}

/**
 * Publish a listing (draft or paused → published).
 */
export async function publishListing(
  userId: string,
  id: string,
): Promise<ListingData> {
  await withOwnedListing(userId, id, async (listing, transaction) => {
    if (listing.status !== "draft" && listing.status !== "paused") {
      throw Object.assign(
        new Error("Only draft or paused listings can be published."),
        { code: "INVALID_OPERATION" },
      );
    }
    await assertPublishable(listing);
    await listing.update({ status: "published" }, { transaction });
  });

  return getListingById(id, { userId, roles: [] });
}

/**
 * Pause a listing (published → paused).
 */
export async function pauseListing(
  userId: string,
  id: string,
): Promise<ListingData> {
  await withOwnedListing(userId, id, async (listing, transaction) => {
    if (listing.status !== "published") {
      throw Object.assign(
        new Error("Only published listings can be paused."),
        { code: "INVALID_OPERATION" },
      );
    }
    await listing.update({ status: "paused" }, { transaction });
  });

  return getListingById(id, { userId, roles: [] });
}

/**
 * Resume a listing (paused → published).
 */
export async function resumeListing(
  userId: string,
  id: string,
): Promise<ListingData> {
  await withOwnedListing(userId, id, async (listing, transaction) => {
    if (listing.status !== "paused") {
      throw Object.assign(
        new Error("Only paused listings can be resumed."),
        { code: "INVALID_OPERATION" },
      );
    }
    await assertPublishable(listing);
    await listing.update({ status: "published" }, { transaction });
  });

  return getListingById(id, { userId, roles: [] });
}

/**
 * Close a listing (any non-closed status → closed).
 */
export async function closeListing(
  userId: string,
  id: string,
): Promise<ListingData> {
  await withOwnedListing(userId, id, async (listing, transaction) => {
    if (listing.status === "closed") {
      throw Object.assign(new Error("Listing is already closed."), {
        code: "INVALID_OPERATION",
      });
    }
    await listing.update({ status: "closed" }, { transaction });
  });

  return getListingById(id, { userId, roles: [] });
}

/**
 * Delete a listing. Only unused drafts may be deleted; listings with any
 * inventory adjustment history are retained so the audit trail is never lost.
 */
export async function deleteListing(userId: string, id: string): Promise<void> {
  await withOwnedListing(userId, id, async (listing, transaction) => {
    if (listing.status !== "draft") {
      throw Object.assign(
        new Error("Only draft listings can be deleted."),
        { code: "INVALID_OPERATION" },
      );
    }

    const adjustmentCount = await InventoryAdjustment.count({
      where: { listing_id: listing.id },
    });
    if (adjustmentCount > 0) {
      throw Object.assign(
        new Error(
          "This listing has inventory history and cannot be deleted. Close it instead.",
        ),
        { code: "INVALID_OPERATION" },
      );
    }

    await listing.destroy({ transaction });
  });
}
