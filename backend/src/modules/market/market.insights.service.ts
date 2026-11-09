import { Op, QueryTypes, type Includeable, type WhereOptions } from "sequelize";
import { env } from "../../config/env.js";
import {
  MarketInsight,
  ProduceCategory,
  ProduceType,
  sequelize,
} from "../../database/models/index.js";
import type {
  MarketInsightSeverity,
  MarketInsightType,
} from "../../database/models/market-insight.model.js";
import type {
  InsightGenerationResult,
  MarketInsightData,
  PaginatedMarketInsights,
} from "./market.types.js";
import {
  buildPriceWhere,
  PRICE_POINTS_CTE,
  type PriceFilters,
} from "./market.prices.service.js";
import type {
  GenerateInsightsInput,
  InsightListQuery,
} from "./market.validation.js";

type Row = Record<string, unknown>;

interface InsightCandidate {
  insight_type: MarketInsightType;
  produce_type_id: string;
  produce_category_id: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  currency: string;
  unit: string;
  title: string;
  summary: string;
  severity: MarketInsightSeverity;
  metric_value: number | null;
  comparison_value: number | null;
  change_percentage: number | null;
  observation_count: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
}

type MarketInsightRow = MarketInsight & {
  produce_type?: ProduceType;
  produce_category?: ProduceCategory;
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function numberValue(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

const insightIncludes: Includeable[] = [
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

export function buildInsightData(row: MarketInsightRow): MarketInsightData {
  return {
    id: row.id,
    insight_type: row.insight_type,
    produce_type_id: row.produce_type_id ?? null,
    produce_type_name: row.produce_type?.name ?? null,
    produce_category_id:
      row.produce_category_id ?? row.produce_type?.category_id ?? null,
    produce_category_name: row.produce_category?.name ?? null,
    country: row.country ?? null,
    state_or_region: row.state_or_region ?? null,
    local_government_area: row.local_government_area ?? null,
    currency: row.currency ?? null,
    unit: row.unit ?? null,
    title: row.title,
    summary: row.summary,
    severity: row.severity ?? "low",
    metric_value: nullableNumber(row.metric_value),
    comparison_value: nullableNumber(row.comparison_value),
    change_percentage: nullableNumber(row.change_percentage),
    observation_count: row.observation_count ?? 0,
    period_start: row.period_start,
    period_end: row.period_end,
    status: row.status ?? "active",
    generated_at: row.generated_at!,
    expires_at: row.expires_at ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

async function resolveProduceTypes(input: GenerateInsightsInput): Promise<{
  produceTypes: ProduceType[];
  category: ProduceCategory | null;
}> {
  if (input.produce_type_id) {
    const produceType = await ProduceType.findByPk(input.produce_type_id);
    if (!produceType) {
      throw serviceError("Produce type not found.", "NOT_FOUND");
    }
    return {
      produceTypes: [produceType],
      category: null,
    };
  }

  if (input.produce_category_id) {
    const category = await ProduceCategory.findByPk(input.produce_category_id);
    if (!category) {
      throw serviceError("Produce category not found.", "NOT_FOUND");
    }
    const produceTypes = await ProduceType.findAll({
      where: { category_id: category.id },
      order: [["name", "ASC"]],
    });
    if (produceTypes.length === 0) {
      throw serviceError(
        "No produce types are configured for this category.",
        "NOT_FOUND",
      );
    }
    return { produceTypes, category };
  }

  throw serviceError(
    "Provide either produce_type_id or produce_category_id.",
    "VALIDATION_ERROR",
  );
}

function locationWhere(
  alias: string,
  input: GenerateInsightsInput,
  typeIds: string[],
  replacements: Record<string, unknown>,
): string[] {
  const typePlaceholders = typeIds.map((id, index) => {
    const key = `typeId${index}`;
    replacements[key] = id;
    return `:${key}`;
  });
  const clauses = [
    `${alias}.produce_type_id IN (${typePlaceholders.join(", ")})`,
  ];

  if (input.country) {
    clauses.push(`LOWER(${alias}.country) = LOWER(:country)`);
    replacements["country"] = input.country;
  }
  if (input.state_or_region) {
    clauses.push(`LOWER(${alias}.state_or_region) = LOWER(:stateOrRegion)`);
    replacements["stateOrRegion"] = input.state_or_region;
  }
  if (input.local_government_area) {
    clauses.push(
      `LOWER(${alias}.local_government_area) = LOWER(:localGovernmentArea)`,
    );
    replacements["localGovernmentArea"] = input.local_government_area;
  }

  clauses.push(`${alias}.currency = :currency`);
  replacements["currency"] = input.currency;
  clauses.push(`${alias}.unit = :unit`);
  replacements["unit"] = input.unit;

  return clauses;
}

const SUPPLY_CTE = `
WITH supply AS (
  SELECT
    pl.id,
    pl.produce_type_id,
    pl.currency,
    pl.unit,
    pl.available_quantity,
    pl.country,
    pl.state_or_region,
    pl.local_government_area
  FROM produce_listings pl
  WHERE pl.status = 'published'
    AND pl.available_quantity > 0
    AND (pl.expiry_date IS NULL OR pl.expiry_date >= CURRENT_DATE)
)
`;

const ACTIVE_DEMAND_CTE = `
WITH demand AS (
  SELECT
    br.produce_type_id,
    br.currency,
    br.unit,
    br.requested_quantity,
    br.country,
    br.state_or_region,
    br.local_government_area
  FROM buyer_requests br
  WHERE br.status = 'open'
    AND br.expiry_date >= CURRENT_DATE
)
`;

async function loadInsightMetrics(
  input: GenerateInsightsInput,
  typeIds: string[],
  periodStart: string,
  periodEnd: string,
  previousStart: string,
): Promise<{
  price: Map<string, Row>;
  supply: Map<string, Row>;
  activeDemand: Map<string, Row>;
  currentDemand: Map<string, Row>;
  previousDemand: Map<string, Row>;
}> {
  const priceFilters: PriceFilters = {
    produce_type_ids: typeIds,
    country: input.country,
    state_or_region: input.state_or_region,
    local_government_area: input.local_government_area,
    date_from: previousStart,
    date_to: periodEnd,
    currency: input.currency,
    unit: input.unit,
    allowed_states: null,
  };
  const priceWhere = buildPriceWhere(priceFilters);

  const supplyReplacements: Record<string, unknown> = {};
  const supplyClauses = locationWhere(
    "supply",
    input,
    typeIds,
    supplyReplacements,
  );

  const activeDemandReplacements: Record<string, unknown> = {};
  const activeDemandClauses = locationWhere(
    "demand",
    input,
    typeIds,
    activeDemandReplacements,
  );

  const currentDemandReplacements: Record<string, unknown> = {
    periodStart,
    periodEnd,
  };
  const currentDemandClauses = locationWhere(
    "br",
    input,
    typeIds,
    currentDemandReplacements,
  );
  currentDemandClauses.push(
    "br.created_at::date >= :periodStart",
    "br.created_at::date <= :periodEnd",
    "br.status <> 'cancelled'",
  );

  const previousDemandReplacements: Record<string, unknown> = {
    previousStart,
    periodStart,
  };
  const previousDemandClauses = locationWhere(
    "br",
    input,
    typeIds,
    previousDemandReplacements,
  );
  previousDemandClauses.push(
    "br.created_at::date >= :previousStart",
    "br.created_at::date < :periodStart",
    "br.status <> 'cancelled'",
  );

  const [
    priceRows,
    supplyRows,
    activeDemandRows,
    currentDemandRows,
    previousDemandRows,
  ] = await Promise.all([
    sequelize.query(
      `${PRICE_POINTS_CTE}
       SELECT
         produce_type_id::text AS produce_type_id,
         COUNT(*) FILTER (WHERE observed_at >= :periodStart)::int AS current_count,
         AVG(price_per_unit) FILTER (WHERE observed_at >= :periodStart)::numeric AS current_average,
         STDDEV_SAMP(price_per_unit) FILTER (WHERE observed_at >= :periodStart)::numeric AS current_stddev,
         COUNT(*) FILTER (WHERE observed_at < :periodStart)::int AS previous_count,
         AVG(price_per_unit) FILTER (WHERE observed_at < :periodStart)::numeric AS previous_average
       FROM price_points
       ${priceWhere.sql}
       GROUP BY produce_type_id`,
      {
        replacements: { ...priceWhere.replacements, periodStart },
        type: QueryTypes.SELECT,
      },
    ) as unknown as Promise<Row[]>,
    sequelize.query(
      `${SUPPLY_CTE}
       SELECT
         produce_type_id::text AS produce_type_id,
         COUNT(*)::int AS supply_count,
         COALESCE(SUM(available_quantity), 0)::numeric AS available_quantity
       FROM supply
       WHERE ${supplyClauses.join(" AND ")}
       GROUP BY produce_type_id`,
      {
        replacements: supplyReplacements,
        type: QueryTypes.SELECT,
      },
    ) as unknown as Promise<Row[]>,
    sequelize.query(
      `${ACTIVE_DEMAND_CTE}
       SELECT
         produce_type_id::text AS produce_type_id,
         COUNT(*)::int AS demand_count,
         COALESCE(SUM(requested_quantity), 0)::numeric AS requested_quantity
       FROM demand
       WHERE ${activeDemandClauses.join(" AND ")}
       GROUP BY produce_type_id`,
      {
        replacements: activeDemandReplacements,
        type: QueryTypes.SELECT,
      },
    ) as unknown as Promise<Row[]>,
    sequelize.query(
      `SELECT
         br.produce_type_id::text AS produce_type_id,
         COUNT(*)::int AS demand_count,
         COALESCE(SUM(br.requested_quantity), 0)::numeric AS requested_quantity
       FROM buyer_requests br
       WHERE ${currentDemandClauses.join(" AND ")}
       GROUP BY br.produce_type_id`,
      {
        replacements: currentDemandReplacements,
        type: QueryTypes.SELECT,
      },
    ) as unknown as Promise<Row[]>,
    sequelize.query(
      `SELECT
         br.produce_type_id::text AS produce_type_id,
         COUNT(*)::int AS demand_count,
         COALESCE(SUM(br.requested_quantity), 0)::numeric AS requested_quantity
       FROM buyer_requests br
       WHERE ${previousDemandClauses.join(" AND ")}
       GROUP BY br.produce_type_id`,
      {
        replacements: previousDemandReplacements,
        type: QueryTypes.SELECT,
      },
    ) as unknown as Promise<Row[]>,
  ]);

  const mapByProduce = (rows: Row[]): Map<string, Row> => {
    const map = new Map<string, Row>();
    for (const row of rows) {
      const key = row["produce_type_id"];
      if (key !== null && key !== undefined) {
        map.set(String(key), row);
      }
    }
    return map;
  };

  return {
    price: mapByProduce(priceRows),
    supply: mapByProduce(supplyRows),
    activeDemand: mapByProduce(activeDemandRows),
    currentDemand: mapByProduce(currentDemandRows),
    previousDemand: mapByProduce(previousDemandRows),
  };
}

function severityFor(magnitude: number, threshold: number): MarketInsightSeverity {
  if (magnitude >= threshold * 2) return "high";
  if (magnitude >= threshold * 1.5) return "medium";
  return "low";
}

function locationLabel(input: GenerateInsightsInput): string {
  return (
    input.local_government_area ??
    input.state_or_region ??
    input.country ??
    "all regions"
  );
}

function buildCandidates(
  input: GenerateInsightsInput,
  produceType: ProduceType,
  metrics: {
    price?: Row;
    supply?: Row;
    activeDemand?: Row;
    currentDemand?: Row;
    previousDemand?: Row;
  },
  periodStart: string,
  periodEnd: string,
): InsightCandidate[] {
  const candidates: InsightCandidate[] = [];
  const base = {
    produce_type_id: produceType.id,
    produce_category_id: produceType.category_id ?? null,
    country: input.country ?? null,
    state_or_region: input.state_or_region ?? null,
    local_government_area: input.local_government_area ?? null,
    currency: input.currency,
    unit: input.unit,
    period_start: periodStart,
    period_end: periodEnd,
  };
  const threshold = env.MARKET_INSIGHT_PRICE_CHANGE_THRESHOLD_PERCENT;
  const gapThreshold = env.MARKET_INSIGHT_SUPPLY_DEMAND_GAP_PERCENT;
  const minObservations = env.MARKET_INSIGHT_MIN_OBSERVATIONS;
  const place = locationLabel(input);
  const produceName = produceType.name;

  const price = metrics.price;
  if (price) {
    const currentCount = numberValue(price["current_count"]);
    const previousCount = numberValue(price["previous_count"]);
    const currentAverage = nullableNumber(price["current_average"]);
    const previousAverage = nullableNumber(price["previous_average"]);
    const currentStddev = nullableNumber(price["current_stddev"]);

    if (
      currentCount >= minObservations &&
      previousCount >= minObservations &&
      currentAverage !== null &&
      previousAverage !== null &&
      previousAverage > 0
    ) {
      const change =
        ((currentAverage - previousAverage) / previousAverage) * 100;
      if (Math.abs(change) >= threshold) {
        const direction = change > 0 ? "increased" : "decreased";
        const insightType: MarketInsightType =
          change > 0 ? "price_increase" : "price_decrease";
        candidates.push({
          ...base,
          insight_type: insightType,
          title: `${produceName} price ${direction} ${round(Math.abs(change))}% in ${place}`,
          summary: `The average observed price of ${produceName} ${direction} from ${round(previousAverage)} to ${round(currentAverage)} ${input.currency}/${input.unit} between the previous and current ${env.MARKET_INSIGHT_LOOKBACK_DAYS}-day windows.`,
          severity: severityFor(Math.abs(change), threshold),
          metric_value: round(currentAverage),
          comparison_value: round(previousAverage),
          change_percentage: round(change),
          observation_count: currentCount + previousCount,
          metadata: {
            current_observation_count: currentCount,
            previous_observation_count: previousCount,
            threshold_percent: threshold,
          },
        });
      }
    }

    if (
      currentCount >= minObservations &&
      currentAverage !== null &&
      currentAverage > 0 &&
      currentStddev !== null
    ) {
      const volatility = (currentStddev / currentAverage) * 100;
      if (volatility >= threshold * 2) {
        candidates.push({
          ...base,
          insight_type: "price_volatility",
          title: `${produceName} prices are volatile in ${place}`,
          summary: `The coefficient of variation for ${produceName} prices was ${round(volatility)}% across ${currentCount} observations, indicating elevated price volatility.`,
          severity: severityFor(volatility, threshold * 2),
          metric_value: round(currentStddev),
          comparison_value: round(currentAverage),
          change_percentage: round(volatility),
          observation_count: currentCount,
          metadata: {
            current_observation_count: currentCount,
            average_price: round(currentAverage),
            standard_deviation: round(currentStddev),
          },
        });
      }
    }
  }

  const supply = metrics.supply;
  const activeDemand = metrics.activeDemand;
  const availableQuantity = supply
    ? numberValue(supply["available_quantity"])
    : 0;
  const supplyCount = supply ? numberValue(supply["supply_count"]) : 0;
  const activeRequestedQuantity = activeDemand
    ? numberValue(activeDemand["requested_quantity"])
    : 0;
  const activeDemandCount = activeDemand
    ? numberValue(activeDemand["demand_count"])
    : 0;

  if (activeRequestedQuantity > 0 || availableQuantity > 0) {
    const gap =
      activeRequestedQuantity === 0
        ? availableQuantity > 0
          ? -100
          : 0
        : ((activeRequestedQuantity - availableQuantity) /
            activeRequestedQuantity) *
          100;

    if (gap >= gapThreshold) {
      candidates.push({
        ...base,
        insight_type: "supply_shortage",
        title: `${produceName} supply shortage in ${place}`,
        summary: `Active demand for ${produceName} is ${round(activeRequestedQuantity)} ${input.unit}, while available supply is ${round(availableQuantity)} ${input.unit}, a demand-supply gap of ${round(gap)}%.`,
        severity: severityFor(gap, gapThreshold),
        metric_value: round(activeRequestedQuantity),
        comparison_value: round(availableQuantity),
        change_percentage: round(gap),
        observation_count: activeDemandCount + supplyCount,
        metadata: {
          active_request_count: activeDemandCount,
          active_requested_quantity: round(activeRequestedQuantity),
          active_listing_count: supplyCount,
          available_quantity: round(availableQuantity),
          threshold_percent: gapThreshold,
        },
      });
    }

    if (gap <= -gapThreshold) {
      const surplus = Math.abs(gap);
      candidates.push({
        ...base,
        insight_type: "supply_surplus",
        title: `${produceName} supply surplus in ${place}`,
        summary: `Available supply of ${produceName} is ${round(availableQuantity)} ${input.unit}, compared with active demand of ${round(activeRequestedQuantity)} ${input.unit}, a surplus gap of ${round(surplus)}%.`,
        severity: severityFor(surplus, gapThreshold),
        metric_value: round(availableQuantity),
        comparison_value: round(activeRequestedQuantity),
        change_percentage: round(surplus),
        observation_count: activeDemandCount + supplyCount,
        metadata: {
          active_request_count: activeDemandCount,
          active_requested_quantity: round(activeRequestedQuantity),
          active_listing_count: supplyCount,
          available_quantity: round(availableQuantity),
          threshold_percent: gapThreshold,
        },
      });
    }
  }

  const currentDemand = metrics.currentDemand;
  const previousDemand = metrics.previousDemand;
  const currentDemandCount = currentDemand
    ? numberValue(currentDemand["demand_count"])
    : 0;
  const previousDemandCount = previousDemand
    ? numberValue(previousDemand["demand_count"])
    : 0;
  const currentDemandQuantity = currentDemand
    ? numberValue(currentDemand["requested_quantity"])
    : 0;
  const previousDemandQuantity = previousDemand
    ? numberValue(previousDemand["requested_quantity"])
    : 0;

  if (
    currentDemandCount > 0 &&
    previousDemandCount > 0 &&
    previousDemandQuantity > 0
  ) {
    const change =
      ((currentDemandQuantity - previousDemandQuantity) /
        previousDemandQuantity) *
      100;
    if (Math.abs(change) >= threshold) {
      const direction = change > 0 ? "increased" : "decreased";
      candidates.push({
        ...base,
        insight_type: change > 0 ? "demand_increase" : "demand_decrease",
        title: `${produceName} demand ${direction} ${round(Math.abs(change))}% in ${place}`,
        summary: `Buyer demand for ${produceName} ${direction} from ${round(previousDemandQuantity)} to ${round(currentDemandQuantity)} ${input.unit} between the previous and current ${env.MARKET_INSIGHT_LOOKBACK_DAYS}-day windows.`,
        severity: severityFor(Math.abs(change), threshold),
        metric_value: round(currentDemandQuantity),
        comparison_value: round(previousDemandQuantity),
        change_percentage: round(change),
        observation_count: currentDemandCount + previousDemandCount,
        metadata: {
          current_request_count: currentDemandCount,
          previous_request_count: previousDemandCount,
          threshold_percent: threshold,
        },
      });
    }
  }

  return candidates;
}

function insightDedupeKey(candidate: InsightCandidate): string {
  const location = [
    candidate.country ?? "",
    candidate.state_or_region ?? "",
    candidate.local_government_area ?? "",
  ]
    .join("|")
    .toLowerCase();
  return [
    "market",
    "insight",
    candidate.insight_type,
    candidate.produce_type_id,
    location,
    candidate.currency,
    candidate.unit,
    candidate.period_start,
    candidate.period_end,
  ].join(":");
}

async function persistCandidate(
  candidate: InsightCandidate,
  expiresAt: Date,
): Promise<{ insight: MarketInsightRow; created: boolean }> {
  const dedupeKey = insightDedupeKey(candidate);
  const [row, created] = await MarketInsight.findOrCreate({
    where: { dedupe_key: dedupeKey },
    defaults: {
      insight_type: candidate.insight_type,
      produce_type_id: candidate.produce_type_id,
      produce_category_id: candidate.produce_category_id,
      country: candidate.country,
      state_or_region: candidate.state_or_region,
      local_government_area: candidate.local_government_area,
      currency: candidate.currency,
      unit: candidate.unit,
      title: candidate.title,
      summary: candidate.summary,
      severity: candidate.severity,
      metric_value: candidate.metric_value,
      comparison_value: candidate.comparison_value,
      change_percentage: candidate.change_percentage,
      observation_count: candidate.observation_count,
      period_start: candidate.period_start,
      period_end: candidate.period_end,
      status: "active",
      generated_at: new Date(),
      expires_at: expiresAt,
      metadata: candidate.metadata,
      dedupe_key: dedupeKey,
    },
  });

  if (!created && row.status === "active") {
    await row.update({
      title: candidate.title,
      summary: candidate.summary,
      severity: candidate.severity,
      metric_value: candidate.metric_value,
      comparison_value: candidate.comparison_value,
      change_percentage: candidate.change_percentage,
      observation_count: candidate.observation_count,
      generated_at: new Date(),
      expires_at: expiresAt,
      metadata: candidate.metadata,
    });
  }

  const full = await MarketInsight.findByPk(row.id, {
    include: insightIncludes,
  });
  return { insight: full as MarketInsightRow, created };
}

export async function generateMarketInsights(
  input: GenerateInsightsInput,
): Promise<InsightGenerationResult> {
  const { produceTypes } = await resolveProduceTypes(input);
  const typeIds = produceTypes.map((type) => type.id);
  const periodEnd = input.date_to ?? new Date().toISOString().slice(0, 10);
  const periodStart =
    input.date_from ??
    dateOffset(-env.MARKET_INSIGHT_LOOKBACK_DAYS);
  const periodStartDate = new Date(`${periodStart}T00:00:00Z`);
  const periodEndDate = new Date(`${periodEnd}T00:00:00Z`);
  const windowDays =
    Math.max(
      1,
      Math.round(
        (periodEndDate.getTime() - periodStartDate.getTime()) / 86_400_000,
      ),
    ) + 1;
  const previousStartDate = new Date(periodStartDate);
  previousStartDate.setUTCDate(
    previousStartDate.getUTCDate() - windowDays,
  );
  const previousStart = previousStartDate.toISOString().slice(0, 10);
  const expiresAt = new Date();
  expiresAt.setUTCDate(
    expiresAt.getUTCDate() + env.MARKET_INSIGHT_EXPIRY_DAYS,
  );

  const metrics = await loadInsightMetrics(
    input,
    typeIds,
    periodStart,
    periodEnd,
    previousStart,
  );

  const candidates: InsightCandidate[] = [];
  for (const produceType of produceTypes) {
    candidates.push(
      ...buildCandidates(
        input,
        produceType,
        {
          price: metrics.price.get(produceType.id),
          supply: metrics.supply.get(produceType.id),
          activeDemand: metrics.activeDemand.get(produceType.id),
          currentDemand: metrics.currentDemand.get(produceType.id),
          previousDemand: metrics.previousDemand.get(produceType.id),
        },
        periodStart,
        periodEnd,
      ),
    );
  }

  const insights: MarketInsightData[] = [];
  let generated = 0;
  for (const candidate of candidates) {
    const result = await persistCandidate(candidate, expiresAt);
    if (result.created) generated += 1;
    insights.push(buildInsightData(result.insight));
  }

  return { generated, insights };
}

export async function expireMarketInsights(): Promise<number> {
  const [affected] = await MarketInsight.update(
    { status: "expired" },
    {
      where: {
        status: "active",
        expires_at: { [Op.lt]: new Date() },
      },
    },
  );
  return affected;
}

export async function listMarketInsights(
  query: InsightListQuery,
): Promise<PaginatedMarketInsights> {
  await expireMarketInsights();

  const where: WhereOptions<MarketInsight> = { status: query.status };
  if (query.produce_type_id) {
    where.produce_type_id = query.produce_type_id;
  }
  if (query.produce_category_id) {
    where.produce_category_id = query.produce_category_id;
  }
  if (query.type) {
    where.insight_type = query.type;
  }
  if (query.severity) {
    where.severity = query.severity;
  }
  if (query.currency) {
    where.currency = query.currency;
  }
  if (query.unit) {
    where.unit = query.unit;
  }
  if (query.country) {
    where.country = { [Op.iLike]: query.country };
  }
  if (query.state_or_region) {
    where.state_or_region = { [Op.iLike]: query.state_or_region };
  }
  if (query.local_government_area) {
    where.local_government_area = {
      [Op.iLike]: query.local_government_area,
    };
  }

  const { rows, count } = await MarketInsight.findAndCountAll({
    where,
    include: insightIncludes,
    order: [
      ["severity", "DESC"],
      ["generated_at", "DESC"],
    ],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  return {
    insights: rows.map((row) => buildInsightData(row as MarketInsightRow)),
    ...paginationMeta(count, query.page, query.limit),
  };
}

export async function getMarketInsight(
  id: string,
): Promise<MarketInsightData> {
  await expireMarketInsights();
  const row = await MarketInsight.findByPk(id, { include: insightIncludes });
  if (!row) {
    throw serviceError("Market insight not found.", "NOT_FOUND");
  }
  return buildInsightData(row as MarketInsightRow);
}
