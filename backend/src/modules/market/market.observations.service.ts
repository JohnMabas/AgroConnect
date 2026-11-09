import { createHash } from "node:crypto";
import {
  Op,
  UniqueConstraintError,
  type Includeable,
  type WhereOptions,
} from "sequelize";
import { env } from "../../config/env.js";
import {
  CooperativeAgentAssignment,
  CooperativeProfile,
  MarketObservation,
  MarketPrice,
  ProduceCategory,
  ProduceType,
  User,
  sequelize,
} from "../../database/models/index.js";
import { notifyAdmins } from "../../services/admin-users.service.js";
import {
  cleanOptionalSingleLine,
  cleanOptionalText,
} from "../../utils/plain-text.js";
import { dispatchNotification } from "../notifications/notifications.service.js";
import { assertStateAllowed } from "./market.scope.js";
import type {
  MarketAccessScope,
  MarketObservationData,
  PaginatedMarketObservations,
} from "./market.types.js";
import type {
  AdminObservationsQuery,
  ApproveObservationInput,
  CreateMarketObservationInput,
  MyObservationsQuery,
  RejectObservationInput,
} from "./market.validation.js";

type ObservationRow = MarketObservation & {
  submitted_by?: User;
  reviewed_by?: User;
  cooperative?: CooperativeProfile;
  produce_type?: ProduceType;
  produce_category?: ProduceCategory;
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

async function safeNotify(input: Parameters<typeof dispatchNotification>[0]) {
  try {
    await dispatchNotification(input);
  } catch (error) {
    console.error("Market observation notification dispatch failed:", error);
  }
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildDedupeKey(input: {
  submitted_by_user_id: string;
  produce_type_id: string | null;
  produce_category_id: string | null;
  market_name: string | null;
  price_per_unit: number;
  currency: string;
  unit: string;
  observed_at: string;
  state_or_region: string | null;
  local_government_area: string | null;
}): string {
  const payload = [
    input.submitted_by_user_id,
    input.produce_type_id ?? "",
    input.produce_category_id ?? "",
    (input.market_name ?? "").trim().toLowerCase(),
    input.price_per_unit.toFixed(2),
    input.currency,
    input.unit.trim().toLowerCase(),
    input.observed_at,
    (input.state_or_region ?? "").trim().toLowerCase(),
    (input.local_government_area ?? "").trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

const observationIncludes: Includeable[] = [
  {
    model: User,
    as: "submitted_by",
    attributes: ["id", "display_name"],
  },
  {
    model: User,
    as: "reviewed_by",
    attributes: ["id", "display_name"],
  },
  {
    model: CooperativeProfile,
    as: "cooperative",
    attributes: ["id", "cooperative_name"],
  },
  {
    model: ProduceType,
    as: "produce_type",
    attributes: ["id", "name", "category_id"],
  },
  {
    model: ProduceCategory,
    as: "produce_category",
    attributes: ["id", "name"],
  },
];

export function buildObservationData(
  row: ObservationRow,
): MarketObservationData {
  return {
    id: row.id,
    submitted_by_user_id: row.submitted_by_user_id,
    cooperative_id: row.cooperative_id ?? null,
    produce_type_id: row.produce_type_id ?? null,
    produce_type_name: row.produce_type?.name ?? null,
    produce_category_id:
      row.produce_category_id ?? row.produce_type?.category_id ?? null,
    produce_category_name: row.produce_category?.name ?? null,
    market_name: row.market_name ?? null,
    price_per_unit: numberValue(row.price_per_unit),
    currency: row.currency,
    unit: row.unit,
    grade: row.grade ?? null,
    variety: row.variety ?? null,
    quantity: nullableNumber(row.quantity),
    country: row.country ?? null,
    state_or_region: row.state_or_region ?? null,
    local_government_area: row.local_government_area ?? null,
    community: row.community ?? null,
    observed_at: row.observed_at,
    notes: row.notes ?? null,
    status: row.status ?? "pending",
    reviewed_by_user_id: row.reviewed_by_user_id ?? null,
    reviewed_at: row.reviewed_at ?? null,
    rejection_reason: row.rejection_reason ?? null,
    submitted_by: row.submitted_by
      ? {
          id: row.submitted_by.id,
          display_name: row.submitted_by.display_name ?? null,
        }
      : undefined,
    reviewed_by: row.reviewed_by
      ? {
          id: row.reviewed_by.id,
          display_name: row.reviewed_by.display_name ?? null,
        }
      : undefined,
    cooperative: row.cooperative
      ? {
          id: row.cooperative.id,
          cooperative_name: row.cooperative.cooperative_name,
        }
      : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

async function findObservation(id: string): Promise<ObservationRow> {
  const row = await MarketObservation.findByPk(id, {
    include: observationIncludes,
  });
  if (!row) {
    throw serviceError("Market observation not found.", "NOT_FOUND");
  }
  return row as ObservationRow;
}

async function resolveProduce(
  produceTypeId: string | undefined,
  produceCategoryId: string | undefined,
): Promise<{
  produceType: ProduceType | null;
  produceCategory: ProduceCategory | null;
  produceTypeId: string | null;
  produceCategoryId: string | null;
  produceName: string | null;
}> {
  let produceType: ProduceType | null = null;
  let produceCategory: ProduceCategory | null = null;

  if (produceTypeId) {
    produceType = await ProduceType.findByPk(produceTypeId);
    if (!produceType) {
      throw serviceError("Produce type not found.", "NOT_FOUND");
    }
  }

  if (produceCategoryId) {
    produceCategory = await ProduceCategory.findByPk(produceCategoryId);
    if (!produceCategory) {
      throw serviceError("Produce category not found.", "NOT_FOUND");
    }
  }

  if (
    produceType &&
    produceCategory &&
    produceType.category_id !== produceCategory.id
  ) {
    throw serviceError(
      "The produce type does not belong to the selected category.",
      "VALIDATION_ERROR",
    );
  }

  const resolvedCategoryId =
    produceType?.category_id ?? produceCategory?.id ?? null;
  return {
    produceType,
    produceCategory,
    produceTypeId: produceType?.id ?? null,
    produceCategoryId: resolvedCategoryId,
    produceName: produceType?.name ?? produceCategory?.name ?? null,
  };
}

async function assertCooperativeAccess(
  userId: string,
  cooperativeId: string,
  roles: string[],
): Promise<CooperativeProfile> {
  const cooperative = await CooperativeProfile.findByPk(cooperativeId);
  if (!cooperative) {
    throw serviceError("Cooperative not found.", "NOT_FOUND");
  }
  if (roles.includes("admin")) return cooperative;
  if (
    roles.includes("cooperative") &&
    cooperative.registered_by_user_id === userId
  ) {
    return cooperative;
  }
  const assignment = await CooperativeAgentAssignment.findOne({
    where: {
      agent_user_id: userId,
      cooperative_id: cooperativeId,
      status: "active",
    },
  });
  if (!assignment) {
    throw serviceError(
      "You are not assigned to this cooperative.",
      "FORBIDDEN",
    );
  }
  return cooperative;
}

export async function createMarketObservation(
  userId: string,
  roles: string[],
  input: CreateMarketObservationInput,
): Promise<MarketObservationData> {
  const produce = await resolveProduce(
    input.produce_type_id,
    input.produce_category_id,
  );

  if (input.cooperative_id) {
    await assertCooperativeAccess(userId, input.cooperative_id, roles);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (input.observed_at > today) {
    throw serviceError(
      "Observation date cannot be in the future.",
      "VALIDATION_ERROR",
    );
  }
  if (input.observed_at < dateOffset(-env.MARKET_OBSERVATION_MAX_AGE_DAYS)) {
    throw serviceError(
      `Observation date cannot be older than ${env.MARKET_OBSERVATION_MAX_AGE_DAYS} days.`,
      "VALIDATION_ERROR",
    );
  }

  const marketName = cleanOptionalSingleLine(input.market_name);
  const grade = cleanOptionalSingleLine(input.grade);
  const variety = cleanOptionalSingleLine(input.variety);
  const notes = cleanOptionalText(input.notes);
  const country = cleanOptionalSingleLine(input.country);
  const stateOrRegion = cleanOptionalSingleLine(input.state_or_region);
  const localGovernmentArea = cleanOptionalSingleLine(
    input.local_government_area,
  );
  const community = cleanOptionalSingleLine(input.community);

  const dedupeKey = buildDedupeKey({
    submitted_by_user_id: userId,
    produce_type_id: produce.produceTypeId,
    produce_category_id: produce.produceCategoryId,
    market_name: marketName,
    price_per_unit: input.price_per_unit,
    currency: input.currency,
    unit: input.unit,
    observed_at: input.observed_at,
    state_or_region: stateOrRegion,
    local_government_area: localGovernmentArea,
  });

  try {
    const observation = await MarketObservation.create({
      submitted_by_user_id: userId,
      cooperative_id: input.cooperative_id ?? null,
      produce_type_id: produce.produceTypeId,
      produce_category_id: produce.produceCategoryId,
      market_name: marketName,
      price_per_unit: input.price_per_unit,
      currency: input.currency,
      unit: input.unit.trim(),
      grade,
      variety,
      quantity: input.quantity ?? null,
      country,
      state_or_region: stateOrRegion,
      local_government_area: localGovernmentArea,
      community,
      observed_at: input.observed_at,
      notes,
      status: "pending",
      dedupe_key: dedupeKey,
    });

    const row = await findObservation(observation.id);

    await safeNotify({
      user_id: userId,
      notification_type: "market_observation_submitted",
      variables: {
        produce_name: produce.produceName,
        market_name: marketName,
        amount: input.price_per_unit,
        currency: input.currency,
        unit: input.unit,
      },
      related_entity_type: "market_observation",
      related_entity_id: row.id,
      action_url: `/market/observations/${row.id}`,
      dedupe_key: `market:observation:submitted:user:${row.id}`,
    });

    await notifyAdmins({
      notification_type: "market_observation_submitted",
      variables: {
        actor_name: row.submitted_by?.display_name ?? null,
        produce_name: produce.produceName,
        market_name: marketName,
        amount: input.price_per_unit,
        currency: input.currency,
        unit: input.unit,
      },
      related_entity_type: "market_observation",
      related_entity_id: row.id,
      action_url: `/admin/market/observations/${row.id}`,
      dedupe_key_prefix: `market:observation:submitted:admin:${row.id}`,
    });

    return buildObservationData(row);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw serviceError(
        "You have already submitted this market observation.",
        "CONFLICT",
      );
    }
    throw error;
  }
}

function observationWhere(
  query: MyObservationsQuery | AdminObservationsQuery,
  extra: WhereOptions<MarketObservation> = {},
): WhereOptions<MarketObservation> {
  const where: Record<string, unknown> = {
    ...(extra as Record<string, unknown>),
  };

  if (query.produce_type_id) {
    where.produce_type_id = query.produce_type_id;
  }
  if (query.produce_category_id) {
    where.produce_category_id = query.produce_category_id;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.date_from || query.date_to) {
    where.observed_at = {
      ...(query.date_from ? { [Op.gte]: query.date_from } : {}),
      ...(query.date_to ? { [Op.lte]: query.date_to } : {}),
    };
  }

  if ("submitted_by_user_id" in query && query.submitted_by_user_id) {
    where.submitted_by_user_id = query.submitted_by_user_id;
  }
  if ("cooperative_id" in query && query.cooperative_id) {
    where.cooperative_id = query.cooperative_id;
  }

  return where as WhereOptions<MarketObservation>;
}

async function listObservations(
  where: WhereOptions<MarketObservation>,
  page: number,
  limit: number,
): Promise<PaginatedMarketObservations> {
  const { rows, count } = await MarketObservation.findAndCountAll({
    where,
    include: observationIncludes,
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  return {
    observations: rows.map((row) => buildObservationData(row as ObservationRow)),
    ...paginationMeta(count, page, limit),
  };
}

export async function listMyObservations(
  userId: string,
  query: MyObservationsQuery,
): Promise<PaginatedMarketObservations> {
  return listObservations(
    observationWhere(query, { submitted_by_user_id: userId }),
    query.page,
    query.limit,
  );
}

export async function listAdminObservations(
  query: AdminObservationsQuery,
): Promise<PaginatedMarketObservations> {
  return listObservations(observationWhere(query), query.page, query.limit);
}

export async function getObservationDetail(
  id: string,
  userId: string,
  isAdmin: boolean,
  scope?: MarketAccessScope,
): Promise<MarketObservationData> {
  const row = await findObservation(id);
  if (!isAdmin && row.submitted_by_user_id !== userId) {
    if (!scope || scope.allowed_states === null) {
      throw serviceError("Market observation not found.", "NOT_FOUND");
    }
    assertStateAllowed(scope, row.state_or_region);
  }
  return buildObservationData(row);
}

export async function approveMarketObservation(
  adminUserId: string,
  id: string,
  _input: ApproveObservationInput,
): Promise<MarketObservationData> {
  const approved = await sequelize.transaction(async (transaction) => {
    const observation = await MarketObservation.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!observation) {
      throw serviceError("Market observation not found.", "NOT_FOUND");
    }
    if (observation.status !== "pending") {
      throw serviceError(
        "Only pending market observations can be approved.",
        "CONFLICT",
      );
    }

    await observation.update(
      {
        status: "approved",
        reviewed_by_user_id: adminUserId,
        reviewed_at: new Date(),
        rejection_reason: null,
      },
      { transaction },
    );

    await MarketPrice.findOrCreate({
      where: { market_observation_id: observation.id },
      defaults: {
        produce_type_id: observation.produce_type_id ?? null,
        produce_category_id: observation.produce_category_id ?? null,
        source_type: "verified_market_observation",
        source_reference_id: observation.id,
        market_observation_id: observation.id,
        source_name: observation.market_name ?? null,
        price_per_unit: observation.price_per_unit,
        currency: observation.currency,
        unit: observation.unit,
        grade: observation.grade ?? null,
        variety: observation.variety ?? null,
        quantity: observation.quantity ?? null,
        country: observation.country ?? null,
        state_or_region: observation.state_or_region ?? null,
        local_government_area: observation.local_government_area ?? null,
        community: observation.community ?? null,
        observed_at: observation.observed_at,
        is_verified: true,
        created_by_user_id: adminUserId,
        dedupe_key: `market:price:observation:${observation.id}`,
      },
      transaction,
    });

    return observation;
  });

  const row = await findObservation(approved.id);
  await safeNotify({
    user_id: row.submitted_by_user_id,
    notification_type: "market_observation_approved",
    variables: {
      produce_name: row.produce_type?.name ?? row.produce_category?.name ?? null,
      market_name: row.market_name ?? null,
      amount: numberValue(row.price_per_unit),
      currency: row.currency,
      unit: row.unit,
    },
    related_entity_type: "market_observation",
    related_entity_id: row.id,
    action_url: `/market/observations/${row.id}`,
    dedupe_key: `market:observation:approved:${row.id}`,
  });

  return buildObservationData(row);
}

export async function rejectMarketObservation(
  adminUserId: string,
  id: string,
  input: RejectObservationInput,
): Promise<MarketObservationData> {
  const reason = cleanOptionalText(input.reason) ?? input.reason;
  const rejected = await sequelize.transaction(async (transaction) => {
    const observation = await MarketObservation.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!observation) {
      throw serviceError("Market observation not found.", "NOT_FOUND");
    }
    if (observation.status !== "pending") {
      throw serviceError(
        "Only pending market observations can be rejected.",
        "CONFLICT",
      );
    }

    await observation.update(
      {
        status: "rejected",
        reviewed_by_user_id: adminUserId,
        reviewed_at: new Date(),
        rejection_reason: reason,
      },
      { transaction },
    );

    return observation;
  });

  const row = await findObservation(rejected.id);
  await safeNotify({
    user_id: row.submitted_by_user_id,
    notification_type: "market_observation_rejected",
    variables: {
      produce_name: row.produce_type?.name ?? row.produce_category?.name ?? null,
      market_name: row.market_name ?? null,
      reason,
    },
    related_entity_type: "market_observation",
    related_entity_id: row.id,
    action_url: `/market/observations/${row.id}`,
    dedupe_key: `market:observation:rejected:${row.id}`,
  });

  return buildObservationData(row);
}
