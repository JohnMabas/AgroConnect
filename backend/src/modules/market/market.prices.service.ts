import { QueryTypes } from "sequelize";
import { env } from "../../config/env.js";
import { sequelize } from "../../database/models/index.js";
import type { MarketPriceSource } from "../../database/models/market-price.model.js";
import type {
  PriceComparisonGroup,
  PriceGroup,
  PriceListResult,
  PricePointData,
  PriceSourceBreakdown,
  PriceSummary,
  PriceTrendPoint,
  PriceTrendResult,
  MarketAccessScope,
} from "./market.types.js";
import {
  assertStateAllowed,
  assertStatesAllowed,
} from "./market.scope.js";
import type {
  PriceCompareQuery,
  PriceListQuery,
  PriceTrendQuery,
} from "./market.validation.js";

type Row = Record<string, unknown>;

export interface PriceFilters {
  produce_type_id?: string;
  produce_category_id?: string;
  produce_type_ids?: string[];
  produce_category_ids?: string[];
  state_or_regions?: string[];
  country?: string;
  state_or_region?: string;
  local_government_area?: string;
  date_from?: string;
  date_to?: string;
  currency: string;
  unit?: string;
  source?: MarketPriceSource;
  allowed_states?: string[] | null;
}

export const PRICE_POINTS_CTE = `
WITH price_points AS (
  SELECT
    pl.id AS source_id,
    'marketplace_listing'::text AS source_type,
    pl.produce_type_id,
    pt.category_id AS produce_category_id,
    pl.price_per_unit,
    pl.currency,
    pl.unit,
    pl.grade,
    pl.variety,
    pl.available_quantity AS quantity,
    pl.country,
    pl.state_or_region,
    pl.local_government_area,
    pl.community,
    pl.created_at::date AS observed_at
  FROM produce_listings pl
  JOIN produce_types pt ON pt.id = pl.produce_type_id
  WHERE pl.status = 'published'
    AND pl.available_quantity > 0
    AND (pl.expiry_date IS NULL OR pl.expiry_date >= CURRENT_DATE)

  UNION ALL

  SELECT
    o.id AS source_id,
    'completed_transaction'::text AS source_type,
    pl.produce_type_id,
    pt.category_id AS produce_category_id,
    o.unit_price AS price_per_unit,
    o.currency,
    o.unit,
    pl.grade,
    pl.variety,
    o.quantity,
    pl.country,
    pl.state_or_region,
    pl.local_government_area,
    pl.community,
    COALESCE(o.completed_at, o.paid_at, o.created_at)::date AS observed_at
  FROM orders o
  JOIN produce_listings pl ON pl.id = o.listing_id
  JOIN produce_types pt ON pt.id = pl.produce_type_id
  WHERE o.status = 'completed'
    AND o.payment_status IN ('paid', 'partially_refunded')

  UNION ALL

  SELECT
    mp.id AS source_id,
    mp.source_type::text AS source_type,
    mp.produce_type_id,
    mp.produce_category_id,
    mp.price_per_unit,
    mp.currency,
    mp.unit,
    mp.grade,
    mp.variety,
    mp.quantity,
    mp.country,
    mp.state_or_region,
    mp.local_government_area,
    mp.community,
    mp.observed_at
  FROM market_prices mp
  WHERE mp.is_verified = true
    AND mp.source_type IN (
      'verified_market_observation',
      'approved_external_source'
    )
)
`;

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

function stringValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function scopeFilters(filters: PriceFilters): PriceFilters {
  return {
    ...filters,
    allowed_states: filters.allowed_states,
  };
}

export function buildPriceWhere(
  input: PriceFilters,
  alias = "price_points",
): { sql: string; replacements: Record<string, unknown> } {
  const f = scopeFilters(input);
  const p = alias ? `${alias}.` : "";
  const clauses: string[] = [];
  const replacements: Record<string, unknown> = {};

  if (f.produce_type_id) {
    clauses.push(`${p}produce_type_id = :produceTypeId`);
    replacements["produceTypeId"] = f.produce_type_id;
  }
  if (f.produce_type_ids && f.produce_type_ids.length > 0) {
    const placeholders = f.produce_type_ids.map((id, index) => {
      const key = `produceTypeId${index}`;
      replacements[key] = id;
      return `:${key}`;
    });
    clauses.push(`${p}produce_type_id IN (${placeholders.join(", ")})`);
  }
  if (f.produce_category_id) {
    clauses.push(`${p}produce_category_id = :produceCategoryId`);
    replacements["produceCategoryId"] = f.produce_category_id;
  }
  if (f.produce_category_ids && f.produce_category_ids.length > 0) {
    const placeholders = f.produce_category_ids.map((id, index) => {
      const key = `produceCategoryId${index}`;
      replacements[key] = id;
      return `:${key}`;
    });
    clauses.push(`${p}produce_category_id IN (${placeholders.join(", ")})`);
  }
  if (f.country) {
    clauses.push(`LOWER(${p}country) = LOWER(:country)`);
    replacements["country"] = f.country;
  }
  if (f.state_or_region) {
    clauses.push(`LOWER(${p}state_or_region) = LOWER(:stateOrRegion)`);
    replacements["stateOrRegion"] = f.state_or_region;
  }
  if (f.local_government_area) {
    clauses.push(`LOWER(${p}local_government_area) = LOWER(:localGovernmentArea)`);
    replacements["localGovernmentArea"] = f.local_government_area;
  }
  if (f.state_or_regions && f.state_or_regions.length > 0) {
    const placeholders = f.state_or_regions.map((state, index) => {
      const key = `compareState${index}`;
      replacements[key] = state.toLowerCase();
      return `:${key}`;
    });
    clauses.push(
      `LOWER(${p}state_or_region) IN (${placeholders.join(", ")})`,
    );
  } else if (f.allowed_states !== null && f.allowed_states !== undefined) {
    const placeholders = f.allowed_states.map((state, index) => {
      const key = `allowedState${index}`;
      replacements[key] = state.toLowerCase();
      return `:${key}`;
    });
    clauses.push(
      `LOWER(${p}state_or_region) IN (${placeholders.join(", ")})`,
    );
  }
  if (f.date_from) {
    clauses.push(`${p}observed_at >= :dateFrom`);
    replacements["dateFrom"] = f.date_from;
  }
  if (f.date_to) {
    clauses.push(`${p}observed_at <= :dateTo`);
    replacements["dateTo"] = f.date_to;
  }
  if (f.currency) {
    clauses.push(`${p}currency = :currency`);
    replacements["currency"] = f.currency;
  }
  if (f.unit) {
    clauses.push(`${p}unit = :unit`);
    replacements["unit"] = f.unit;
  }
  if (f.source) {
    clauses.push(`${p}source_type = :source`);
    replacements["source"] = f.source;
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    replacements,
  };
}

function mapPriceSummary(row: Row): PriceSummary {
  return {
    observation_count: numberValue(row["observation_count"]),
    source_count: numberValue(row["source_count"]),
    total_quantity: numberValue(row["total_quantity"]),
    average_price: numberValue(row["average_price"]),
    min_price: numberValue(row["min_price"]),
    max_price: numberValue(row["max_price"]),
    median_price: numberValue(row["median_price"]),
    standard_deviation: numberValue(row["standard_deviation"]),
    currency: stringValue(row["currency"]),
    unit: stringValue(row["unit"]),
    source_breakdown: [],
  };
}

function mapSourceBreakdown(row: Row): PriceSourceBreakdown {
  return {
    source_type: stringValue(row["source_type"]) as MarketPriceSource,
    observation_count: numberValue(row["observation_count"]),
    total_quantity: numberValue(row["total_quantity"]),
    average_price: numberValue(row["average_price"]),
    min_price: numberValue(row["min_price"]),
    max_price: numberValue(row["max_price"]),
  };
}

function mapPricePoint(row: Row): PricePointData {
  return {
    source_id: stringValue(row["source_id"]),
    source_type: stringValue(row["source_type"]) as MarketPriceSource,
    produce_type_id: nullableString(row["produce_type_id"]),
    produce_type_name: nullableString(row["produce_type_name"]),
    produce_category_id: nullableString(row["produce_category_id"]),
    produce_category_name: nullableString(row["produce_category_name"]),
    price_per_unit: numberValue(row["price_per_unit"]),
    currency: stringValue(row["currency"]),
    unit: stringValue(row["unit"]),
    grade: nullableString(row["grade"]),
    variety: nullableString(row["variety"]),
    quantity: nullableNumber(row["quantity"]),
    country: nullableString(row["country"]),
    state_or_region: nullableString(row["state_or_region"]),
    local_government_area: nullableString(row["local_government_area"]),
    community: nullableString(row["community"]),
    observed_at: String(row["observed_at"]).slice(0, 10),
  };
}

function listFilters(
  query: PriceListQuery,
  scope: MarketAccessScope,
): PriceFilters {
  assertStateAllowed(scope, query.state_or_region);
  return {
    ...query,
    allowed_states: scope.allowed_states,
  };
}

export async function listMarketPrices(
  query: PriceListQuery,
  scope: MarketAccessScope,
): Promise<PriceListResult> {
  const filters = listFilters(query, scope);
  const where = buildPriceWhere(filters);

  const groupRows = (await sequelize.query(
    `${PRICE_POINTS_CTE}
     SELECT
       currency,
       unit,
       COUNT(*)::int AS observation_count,
       COUNT(DISTINCT source_type)::int AS source_count,
       COALESCE(SUM(quantity), 0)::numeric AS total_quantity,
       COALESCE(AVG(price_per_unit), 0)::numeric AS average_price,
       COALESCE(MIN(price_per_unit), 0)::numeric AS min_price,
       COALESCE(MAX(price_per_unit), 0)::numeric AS max_price,
       COALESCE(
         percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_unit),
         0
       )::numeric AS median_price,
       COALESCE(STDDEV_SAMP(price_per_unit), 0)::numeric AS standard_deviation
     FROM price_points
     ${where.sql}
     GROUP BY currency, unit
     ORDER BY observation_count DESC, currency ASC, unit ASC`,
    {
      replacements: where.replacements,
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];

  const sourceRows = (await sequelize.query(
    `${PRICE_POINTS_CTE}
     SELECT
       currency,
       unit,
       source_type,
       COUNT(*)::int AS observation_count,
       COALESCE(SUM(quantity), 0)::numeric AS total_quantity,
       COALESCE(AVG(price_per_unit), 0)::numeric AS average_price,
       COALESCE(MIN(price_per_unit), 0)::numeric AS min_price,
       COALESCE(MAX(price_per_unit), 0)::numeric AS max_price
     FROM price_points
     ${where.sql}
     GROUP BY currency, unit, source_type
     ORDER BY currency ASC, unit ASC, source_type ASC`,
    {
      replacements: where.replacements,
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];

  const sourceMap = new Map<string, PriceSourceBreakdown[]>();
  for (const row of sourceRows) {
    const key = `${stringValue(row["currency"])}|${stringValue(row["unit"])}`;
    const list = sourceMap.get(key) ?? [];
    list.push(mapSourceBreakdown(row));
    sourceMap.set(key, list);
  }

  const groups: PriceGroup[] = groupRows.map((row) => {
    const summary = mapPriceSummary(row);
    return {
      ...summary,
      source_breakdown:
        sourceMap.get(`${summary.currency}|${summary.unit}`) ?? [],
    };
  });

  const sort = query.sort;
  const order =
    sort === "oldest"
      ? "pp.observed_at ASC, pp.price_per_unit ASC, pp.source_id ASC"
      : sort === "price_asc"
        ? "pp.price_per_unit ASC, pp.observed_at DESC, pp.source_id ASC"
        : sort === "price_desc"
          ? "pp.price_per_unit DESC, pp.observed_at DESC, pp.source_id ASC"
          : "pp.observed_at DESC, pp.price_per_unit DESC, pp.source_id ASC";

  const priceRows = (await sequelize.query(
    `${PRICE_POINTS_CTE}
     SELECT
       pp.*,
       pt.name AS produce_type_name,
       pc.name AS produce_category_name,
       COUNT(*) OVER()::int AS total_count
     FROM price_points pp
     LEFT JOIN produce_types pt ON pt.id = pp.produce_type_id
     LEFT JOIN produce_categories pc ON pc.id = pp.produce_category_id
     ${buildPriceWhere(filters, "pp").sql}
     ORDER BY ${order}
     LIMIT :limit OFFSET :offset`,
    {
      replacements: {
        ...buildPriceWhere(filters, "pp").replacements,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      },
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];

  const total = priceRows.length > 0 ? numberValue(priceRows[0]?.["total_count"]) : 0;
  return {
    prices: priceRows.map(mapPricePoint),
    total,
    page: query.page,
    limit: query.limit,
    total_pages: total === 0 ? 0 : Math.ceil(total / query.limit),
    summary: groups.length === 1 ? groups[0] ?? null : null,
    groups,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function getPriceTrends(
  query: PriceTrendQuery,
  scope: MarketAccessScope,
): Promise<PriceTrendResult> {
  assertStateAllowed(scope, query.state_or_region);
  const filters: PriceFilters = {
    ...query,
    date_from:
      query.date_from ??
      dateOffset(-env.MARKET_ANALYTICS_DEFAULT_WINDOW_DAYS),
    date_to: query.date_to ?? todayIso(),
    allowed_states: scope.allowed_states,
  };
  const where = buildPriceWhere(filters);

  const rows = (await sequelize.query(
    `${PRICE_POINTS_CTE}
     SELECT
       date_trunc(:period, observed_at::timestamp)::date AS period,
       COUNT(*)::int AS observation_count,
       COALESCE(AVG(price_per_unit), 0)::numeric AS average_price,
       COALESCE(MIN(price_per_unit), 0)::numeric AS min_price,
       COALESCE(MAX(price_per_unit), 0)::numeric AS max_price,
       COALESCE(
         percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_unit),
         0
       )::numeric AS median_price
     FROM price_points
     ${where.sql}
     GROUP BY 1
     ORDER BY 1 ASC`,
    {
      replacements: { ...where.replacements, period: query.period },
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];

  const trend: PriceTrendPoint[] = rows.map((row) => ({
    period: String(row["period"]).slice(0, 10),
    observation_count: numberValue(row["observation_count"]),
    average_price: numberValue(row["average_price"]),
    min_price: numberValue(row["min_price"]),
    max_price: numberValue(row["max_price"]),
    median_price: numberValue(row["median_price"]),
  }));

  const first = trend[0];
  const last = trend[trend.length - 1];
  const change =
    first && last && trend.length >= 2 && first.average_price > 0
      ? ((last.average_price - first.average_price) / first.average_price) * 100
      : null;
  const direction =
    change === null
      ? "insufficient_data"
      : change > 1
        ? "rising"
        : change < -1
          ? "falling"
          : "stable";

  return {
    currency: query.currency,
    unit: query.unit,
    period: query.period,
    trend,
    change_percentage:
      change === null ? null : Math.round(change * 100) / 100,
    direction,
  };
}

export async function compareMarketPrices(
  query: PriceCompareQuery,
  scope: MarketAccessScope,
): Promise<PriceComparisonGroup[]> {
  assertStateAllowed(scope, query.state_or_region);
  assertStatesAllowed(scope, query.state_or_regions);

  const filters: PriceFilters = {
    ...query,
    allowed_states: scope.allowed_states,
  };
  const where = buildPriceWhere(filters);

  const rows = (await sequelize.query(
    `${PRICE_POINTS_CTE},
     grouped AS (
       SELECT
         produce_type_id,
         produce_category_id,
         country,
         state_or_region,
         local_government_area,
         currency,
         unit,
         COUNT(*)::int AS observation_count,
         COALESCE(AVG(price_per_unit), 0)::numeric AS average_price,
         COALESCE(MIN(price_per_unit), 0)::numeric AS min_price,
         COALESCE(MAX(price_per_unit), 0)::numeric AS max_price,
         COALESCE(
           percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_unit),
           0
         )::numeric AS median_price
       FROM price_points
       ${where.sql}
       GROUP BY
         produce_type_id,
         produce_category_id,
         country,
         state_or_region,
         local_government_area,
         currency,
         unit
     )
     SELECT
       g.*,
       pt.name AS produce_type_name,
       pc.name AS produce_category_name
     FROM grouped g
     LEFT JOIN produce_types pt ON pt.id = g.produce_type_id
     LEFT JOIN produce_categories pc ON pc.id = g.produce_category_id
     ORDER BY
       produce_type_name ASC NULLS LAST,
       state_or_region ASC NULLS LAST,
       local_government_area ASC NULLS LAST,
       currency ASC,
       unit ASC`,
    {
      replacements: where.replacements,
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];

  return rows.map((row) => ({
    produce_type_id: nullableString(row["produce_type_id"]),
    produce_type_name: nullableString(row["produce_type_name"]),
    produce_category_id: nullableString(row["produce_category_id"]),
    produce_category_name: nullableString(row["produce_category_name"]),
    country: nullableString(row["country"]),
    state_or_region: nullableString(row["state_or_region"]),
    local_government_area: nullableString(row["local_government_area"]),
    currency: stringValue(row["currency"]),
    unit: stringValue(row["unit"]),
    observation_count: numberValue(row["observation_count"]),
    average_price: numberValue(row["average_price"]),
    min_price: numberValue(row["min_price"]),
    max_price: numberValue(row["max_price"]),
    median_price: numberValue(row["median_price"]),
  }));
}
