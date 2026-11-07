import {
  Op,
  type Includeable,
  type Order,
  type Transaction,
} from "sequelize";
import {
  BuyerRequest,
  ProduceCategory,
  ProduceType,
  User,
  sequelize,
} from "../../database/models/index.js";
import { normalizeDecimal } from "../listings/decimal.js";
import type {
  BuyerRequestData,
  BuyerRequestStatus,
  PaginatedBuyerRequests,
  PublicBuyerData,
} from "./buyer-requests.types.js";
import type {
  CreateBuyerRequestInput,
  ListBuyerRequestsQuery,
  ListMyBuyerRequestsQuery,
  UpdateBuyerRequestInput,
} from "./buyer-requests.validation.js";

const QUANTITY_SCALE = 3;

export interface BuyerRequestViewer {
  userId: string;
  roles: string[];
}

type ProduceTypeRow = ProduceType & { category?: ProduceCategory };

type BuyerRequestRow = BuyerRequest & {
  produce_type?: ProduceTypeRow;
  produce_category?: ProduceCategory;
  buyer?: User;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function buildProduceCategoryData(row: ProduceCategory) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    is_active: row.is_active ?? true,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildProduceTypeData(row: ProduceTypeRow) {
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    image_url: row.image_url ?? null,
    is_active: row.is_active ?? true,
    category: row.category ? buildProduceCategoryData(row.category) : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildBuyerData(row?: User): PublicBuyerData | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    display_name: row.display_name ?? null,
  };
}

function isCurrentlyActive(row: {
  status?: string | null;
  expiry_date?: string | null;
}): boolean {
  if ((row.status ?? "open") !== "open") return false;
  return !row.expiry_date || row.expiry_date >= todayIsoDate();
}

function buildBuyerRequestData(row: BuyerRequestRow): BuyerRequestData {
  return {
    id: row.id,
    buyer_user_id: row.buyer_user_id,
    produce_type_id: row.produce_type_id ?? null,
    produce_category_id: row.produce_category_id ?? null,
    requested_quantity: Number(row.requested_quantity),
    unit: row.unit,
    preferred_location: row.preferred_location ?? null,
    country: row.country ?? null,
    state_or_region: row.state_or_region ?? null,
    local_government_area: row.local_government_area ?? null,
    community: row.community ?? null,
    target_price_per_unit:
      row.target_price_per_unit === null ||
      row.target_price_per_unit === undefined
        ? null
        : Number(row.target_price_per_unit),
    currency: row.currency ?? "NGN",
    additional_requirements: row.additional_requirements ?? null,
    required_delivery_date: row.required_delivery_date ?? null,
    expiry_date: row.expiry_date,
    status: (row.status ?? "open") as BuyerRequestStatus,
    is_active: isCurrentlyActive(row),
    produce_type: row.produce_type
      ? buildProduceTypeData(row.produce_type)
      : undefined,
    produce_category: row.produce_category
      ? buildProduceCategoryData(row.produce_category)
      : undefined,
    buyer: buildBuyerData(row.buyer),
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

const buyerRequestIncludes: Includeable[] = [
  {
    model: ProduceType,
    as: "produce_type",
    include: [{ model: ProduceCategory, as: "category" }],
  },
  { model: ProduceCategory, as: "produce_category" },
  { model: User, as: "buyer", attributes: ["id", "display_name"] },
];

async function expireIfNeeded(
  request: BuyerRequest,
  transaction?: Transaction,
): Promise<void> {
  if (
    (request.status === "open" || request.status === "paused") &&
    request.expiry_date < todayIsoDate()
  ) {
    await request.update(
      { status: "expired" },
      transaction ? { transaction } : undefined,
    );
  }
}

async function resolveProduceReferences(
  input: {
    produce_type_id?: string | null;
    produce_category_id?: string | null;
  },
  transaction?: Transaction,
): Promise<{
  produceTypeId: string | null;
  produceCategoryId: string | null;
}> {
  const produceTypeId = input.produce_type_id ?? null;
  let produceCategoryId = input.produce_category_id ?? null;

  if (produceTypeId) {
    const produceType = (await ProduceType.findOne({
      where: { id: produceTypeId },
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
    if (produceCategoryId && produceType.category_id !== produceCategoryId) {
      throw Object.assign(
        new Error("The selected produce type does not belong to that category."),
        { code: "INVALID_OPERATION" },
      );
    }
    produceCategoryId = produceType.category_id;
  }

  if (produceCategoryId) {
    const category = await ProduceCategory.findByPk(produceCategoryId, {
      transaction,
    });
    if (!category) {
      throw Object.assign(new Error("Produce category not found."), {
        code: "NOT_FOUND",
      });
    }
    if (!category.is_active) {
      throw Object.assign(
        new Error("The selected produce category is no longer available."),
        { code: "INVALID_OPERATION" },
      );
    }
  }

  if (!produceTypeId && !produceCategoryId) {
    throw Object.assign(
      new Error("Provide either produce_type_id or produce_category_id."),
      { code: "INVALID_OPERATION" },
    );
  }

  return { produceTypeId, produceCategoryId };
}

async function findRequestWithIncludes(
  id: string,
): Promise<BuyerRequestRow> {
  const request = await BuyerRequest.findByPk(id, {
    include: buyerRequestIncludes,
  });
  if (!request) {
    throw Object.assign(new Error("Buyer request not found."), {
      code: "NOT_FOUND",
    });
  }
  return request as BuyerRequestRow;
}

// ─── Expiry ──────────────────────────────────────────────────────────────────

/**
 * Mark every open or paused request whose expiry date has passed as expired.
 * Safe to run repeatedly and safe to run concurrently with request reads.
 */
export async function expireBuyerRequests(): Promise<number> {
  const [affected] = await BuyerRequest.update(
    { status: "expired" },
    {
      where: {
        status: { [Op.in]: ["open", "paused"] },
        expiry_date: { [Op.lt]: todayIsoDate() },
      },
    },
  );
  return affected;
}

const DEFAULT_EXPIRY_INTERVAL_MS = 15 * 60 * 1000;
let expiryTimer: NodeJS.Timeout | undefined;

/**
 * Start the in-process expiry sweep. A database sweep is also performed before
 * every discovery/read, so the job is a safety net rather than the only path.
 */
export function startBuyerRequestExpiryJob(
  intervalMs = DEFAULT_EXPIRY_INTERVAL_MS,
): void {
  if (expiryTimer) return;

  const run = (): void => {
    void expireBuyerRequests().catch((error: unknown) => {
      console.error("Buyer request expiry sweep failed:", error);
    });
  };

  run();
  expiryTimer = setInterval(run, intervalMs);
  expiryTimer.unref();
}

export function stopBuyerRequestExpiryJob(): void {
  if (expiryTimer) {
    clearInterval(expiryTimer);
    expiryTimer = undefined;
  }
}

// ─── Buyer request lifecycle ─────────────────────────────────────────────────

/**
 * Create an open buyer request. Any authenticated user may act as a buyer;
 * ownership is enforced on every subsequent mutation.
 */
export async function createBuyerRequest(
  userId: string,
  data: CreateBuyerRequestInput,
): Promise<BuyerRequestData> {
  const refs = await resolveProduceReferences({
    produce_type_id: data.produce_type_id,
    produce_category_id: data.produce_category_id,
  });

  const request = await BuyerRequest.create({
    buyer_user_id: userId,
    produce_type_id: refs.produceTypeId,
    produce_category_id: refs.produceCategoryId,
    requested_quantity: normalizeDecimal(
      data.requested_quantity,
      QUANTITY_SCALE,
    ) as unknown as number,
    unit: data.unit,
    preferred_location: data.preferred_location ?? null,
    country: data.country ?? null,
    state_or_region: data.state_or_region ?? null,
    local_government_area: data.local_government_area ?? null,
    community: data.community ?? null,
    target_price_per_unit: data.target_price_per_unit ?? null,
    currency: data.currency ?? "NGN",
    additional_requirements: data.additional_requirements ?? null,
    required_delivery_date: data.required_delivery_date ?? null,
    expiry_date: data.expiry_date,
    status: "open",
  });

  return buildBuyerRequestData(await findRequestWithIncludes(request.id));
}

/**
 * Return a single request. Owners and admins may read any status; everyone else
 * may only read open requests. Marketplace callers pass no viewer.
 */
export async function getBuyerRequestById(
  id: string,
  viewer?: BuyerRequestViewer,
): Promise<BuyerRequestData> {
  const request = await findRequestWithIncludes(id);
  await expireIfNeeded(request);

  const isOwner = viewer?.userId === request.buyer_user_id;
  const isAdmin = viewer?.roles.includes("admin") ?? false;

  if (!isOwner && !isAdmin && request.status !== "open") {
    throw Object.assign(new Error("Buyer request not found."), {
      code: "NOT_FOUND",
    });
  }

  return buildBuyerRequestData(request);
}

export async function getMarketplaceBuyerRequestById(
  id: string,
): Promise<BuyerRequestData> {
  return getBuyerRequestById(id);
}

/**
 * Return the authenticated user's requests, including inactive ones.
 */
export async function getMyBuyerRequests(
  userId: string,
  filters: ListMyBuyerRequestsQuery,
): Promise<PaginatedBuyerRequests> {
  await expireBuyerRequests();

  const where: Record<string, unknown> = { buyer_user_id: userId };
  if (filters.status) where.status = filters.status;

  const { count, rows } = await BuyerRequest.findAndCountAll({
    where,
    include: buyerRequestIncludes,
    order: [["created_at", "DESC"]],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
  });

  return {
    requests: rows.map((row) => buildBuyerRequestData(row as BuyerRequestRow)),
    total: count,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(count / filters.limit),
  };
}

/**
 * Update an owned request. Fulfilled, cancelled and expired requests are
 * immutable; use the lifecycle endpoints for status changes.
 */
export async function updateBuyerRequest(
  userId: string,
  id: string,
  data: UpdateBuyerRequestInput,
): Promise<BuyerRequestData> {
  await sequelize.transaction(async (transaction) => {
    const request = await BuyerRequest.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!request) {
      throw Object.assign(new Error("Buyer request not found."), {
        code: "NOT_FOUND",
      });
    }
    if (request.buyer_user_id !== userId) {
      throw Object.assign(new Error("You do not own this buyer request."), {
        code: "FORBIDDEN",
      });
    }

    await expireIfNeeded(request, transaction);

    if (request.status !== "open" && request.status !== "paused") {
      throw Object.assign(
        new Error("Only open or paused buyer requests can be updated."),
        { code: "INVALID_OPERATION" },
      );
    }

    const produceTypeChanged = data.produce_type_id !== undefined;
    const produceCategoryChanged = data.produce_category_id !== undefined;
    let refs: { produceTypeId: string | null; produceCategoryId: string | null } | undefined;

    if (produceTypeChanged || produceCategoryChanged) {
      const finalTypeId = produceTypeChanged
        ? (data.produce_type_id ?? null)
        : (request.produce_type_id ?? null);
      const finalCategoryId =
        produceTypeChanged &&
        data.produce_type_id &&
        !produceCategoryChanged
          ? null
          : produceCategoryChanged
            ? (data.produce_category_id ?? null)
            : (request.produce_category_id ?? null);

      refs = await resolveProduceReferences(
        {
          produce_type_id: finalTypeId,
          produce_category_id: finalCategoryId,
        },
        transaction,
      );
    }

    const updatePayload: Record<string, unknown> = { ...data };
    if (refs) {
      updatePayload.produce_type_id = refs.produceTypeId;
      updatePayload.produce_category_id = refs.produceCategoryId;
    }
    if (data.requested_quantity !== undefined) {
      updatePayload.requested_quantity = normalizeDecimal(
        data.requested_quantity,
        QUANTITY_SCALE,
      );
    }
    if (data.expiry_date !== undefined) {
      const expiryDate = data.expiry_date;
      if (expiryDate < todayIsoDate()) {
        throw Object.assign(
          new Error("expiry_date cannot be in the past."),
          { code: "INVALID_OPERATION" },
        );
      }
    }

    await request.update(
      updatePayload as unknown as Partial<BuyerRequest>,
      { transaction },
    );
  });

  return getBuyerRequestById(id, { userId, roles: [] });
}

async function withOwnedBuyerRequest(
  userId: string,
  id: string,
  handler: (
    request: BuyerRequest,
    transaction: Transaction,
  ) => Promise<void> | void,
): Promise<void> {
  await sequelize.transaction(async (transaction) => {
    const request = await BuyerRequest.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!request) {
      throw Object.assign(new Error("Buyer request not found."), {
        code: "NOT_FOUND",
      });
    }
    if (request.buyer_user_id !== userId) {
      throw Object.assign(new Error("You do not own this buyer request."), {
        code: "FORBIDDEN",
      });
    }

    await expireIfNeeded(request, transaction);
    await handler(request, transaction);
  });
}

export async function pauseBuyerRequest(
  userId: string,
  id: string,
): Promise<BuyerRequestData> {
  await withOwnedBuyerRequest(userId, id, async (request, transaction) => {
    if (request.status !== "open") {
      throw Object.assign(
        new Error("Only open buyer requests can be paused."),
        { code: "INVALID_OPERATION" },
      );
    }
    await request.update({ status: "paused" }, { transaction });
  });
  return getBuyerRequestById(id, { userId, roles: [] });
}

export async function reopenBuyerRequest(
  userId: string,
  id: string,
): Promise<BuyerRequestData> {
  await withOwnedBuyerRequest(userId, id, async (request, transaction) => {
    if (request.status === "expired") {
      throw Object.assign(
        new Error("An expired buyer request cannot be reopened."),
        { code: "INVALID_OPERATION" },
      );
    }
    if (request.status !== "paused") {
      throw Object.assign(
        new Error("Only paused buyer requests can be reopened."),
        { code: "INVALID_OPERATION" },
      );
    }
    await request.update({ status: "open" }, { transaction });
  });
  return getBuyerRequestById(id, { userId, roles: [] });
}

export async function fulfillBuyerRequest(
  userId: string,
  id: string,
): Promise<BuyerRequestData> {
  await withOwnedBuyerRequest(userId, id, async (request, transaction) => {
    if (request.status !== "open" && request.status !== "paused") {
      throw Object.assign(
        new Error("Only open or paused buyer requests can be fulfilled."),
        { code: "INVALID_OPERATION" },
      );
    }
    await request.update({ status: "fulfilled" }, { transaction });
  });
  return getBuyerRequestById(id, { userId, roles: [] });
}

export async function cancelBuyerRequest(
  userId: string,
  id: string,
): Promise<BuyerRequestData> {
  await withOwnedBuyerRequest(userId, id, async (request, transaction) => {
    if (request.status !== "open" && request.status !== "paused") {
      throw Object.assign(
        new Error("Only open or paused buyer requests can be cancelled."),
        { code: "INVALID_OPERATION" },
      );
    }
    await request.update({ status: "cancelled" }, { transaction });
  });
  return getBuyerRequestById(id, { userId, roles: [] });
}

// ─── Marketplace discovery ───────────────────────────────────────────────────

/**
 * Discover open, unexpired buyer requests. All filtering happens in SQL.
 */
export async function listOpenBuyerRequests(
  filters: ListBuyerRequestsQuery,
): Promise<PaginatedBuyerRequests> {
  await expireBuyerRequests();

  const conditions: Array<Record<string | symbol, unknown>> = [];

  if (filters.search) {
    const term = `%${escapeLike(filters.search)}%`;
    conditions.push({
      [Op.or]: [
        { "$produce_type.name$": { [Op.iLike]: term } },
        { "$produce_category.name$": { [Op.iLike]: term } },
        { "$produce_type.category.name$": { [Op.iLike]: term } },
        { additional_requirements: { [Op.iLike]: term } },
      ],
    });
  }

  if (filters.location) {
    const location = `%${escapeLike(filters.location)}%`;
    conditions.push({
      [Op.or]: [
        { preferred_location: { [Op.iLike]: location } },
        { country: { [Op.iLike]: location } },
        { state_or_region: { [Op.iLike]: location } },
        { local_government_area: { [Op.iLike]: location } },
        { community: { [Op.iLike]: location } },
      ],
    });
  }

  if (filters.category_slug) {
    conditions.push({
      [Op.or]: [
        { "$produce_category.slug$": filters.category_slug },
        { "$produce_type.category.slug$": filters.category_slug },
      ],
    });
  }

  const where: Record<string | symbol, unknown> = {
    status: "open",
    expiry_date: { [Op.gte]: todayIsoDate() },
    ...(conditions.length > 0 ? { [Op.and]: conditions } : {}),
  };

  if (filters.produce_type_id) {
    where.produce_type_id = filters.produce_type_id;
  }

  if (
    filters.min_quantity !== undefined ||
    filters.max_quantity !== undefined
  ) {
    where.requested_quantity = {
      ...(filters.min_quantity !== undefined
        ? { [Op.gte]: filters.min_quantity }
        : {}),
      ...(filters.max_quantity !== undefined
        ? { [Op.lte]: filters.max_quantity }
        : {}),
    };
  }

  if (
    filters.min_target_price !== undefined ||
    filters.max_target_price !== undefined
  ) {
    where.target_price_per_unit = {
      [Op.not]: null,
      ...(filters.min_target_price !== undefined
        ? { [Op.gte]: filters.min_target_price }
        : {}),
      ...(filters.max_target_price !== undefined
        ? { [Op.lte]: filters.max_target_price }
        : {}),
    };
  }

  if (
    filters.required_delivery_after !== undefined ||
    filters.required_delivery_before !== undefined
  ) {
    where.required_delivery_date = {
      ...(filters.required_delivery_after !== undefined
        ? { [Op.gte]: filters.required_delivery_after }
        : {}),
      ...(filters.required_delivery_before !== undefined
        ? { [Op.lte]: filters.required_delivery_before }
        : {}),
    };
  }

  const order: Order =
    filters.sort === "delivery_soonest"
      ? [
          ["required_delivery_date", "ASC"],
          ["created_at", "DESC"],
        ]
      : [["created_at", "DESC"]];

  const { count, rows } = await BuyerRequest.findAndCountAll({
    where,
    include: buyerRequestIncludes,
    order,
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
    subQuery: false,
  });

  return {
    requests: rows.map((row) => buildBuyerRequestData(row as BuyerRequestRow)),
    total: count,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(count / filters.limit),
  };
}
