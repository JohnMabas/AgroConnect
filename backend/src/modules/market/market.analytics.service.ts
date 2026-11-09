import { QueryTypes } from "sequelize";
import { env } from "../../config/env.js";
import { sequelize } from "../../database/models/index.js";
import type {
  DemandAnalytics,
  DemandGroup,
  MarketAccessScope,
  SupplyAnalytics,
  SupplyGroup,
  TransactionAnalytics,
  TransactionGroup,
} from "./market.types.js";
import { assertStateAllowed } from "./market.scope.js";
import type {
  DemandAnalyticsQuery,
  SupplyAnalyticsQuery,
  TransactionAnalyticsQuery,
} from "./market.validation.js";

type Row = Record<string, unknown>;

interface AnalyticsFilters {
  produce_type_id?: string;
  produce_category_id?: string;
  country?: string;
  state_or_region?: string;
  local_government_area?: string;
  date_from?: string;
  date_to?: string;
  currency: string;
  unit?: string;
  allowed_states?: string[] | null;
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

function stringValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function buildWhere(
  filters: AnalyticsFilters,
  alias: string,
  dateColumn: string,
): { sql: string; replacements: Record<string, unknown> } {
  const clauses: string[] = [];
  const replacements: Record<string, unknown> = {};
  const p = `${alias}.`;

  if (filters.produce_type_id) {
    clauses.push(`${p}produce_type_id = :produceTypeId`);
    replacements["produceTypeId"] = filters.produce_type_id;
  }
  if (filters.produce_category_id) {
    clauses.push(`${p}produce_category_id = :produceCategoryId`);
    replacements["produceCategoryId"] = filters.produce_category_id;
  }
  if (filters.country) {
    clauses.push(`LOWER(${p}country) = LOWER(:country)`);
    replacements["country"] = filters.country;
  }
  if (filters.state_or_region) {
    clauses.push(`LOWER(${p}state_or_region) = LOWER(:stateOrRegion)`);
    replacements["stateOrRegion"] = filters.state_or_region;
  }
  if (filters.local_government_area) {
    clauses.push(`LOWER(${p}local_government_area) = LOWER(:localGovernmentArea)`);
    replacements["localGovernmentArea"] = filters.local_government_area;
  }
  if (filters.allowed_states !== null && filters.allowed_states !== undefined) {
    const placeholders = filters.allowed_states.map((state, index) => {
      const key = `allowedState${index}`;
      replacements[key] = state.toLowerCase();
      return `:${key}`;
    });
    clauses.push(
      `LOWER(${p}state_or_region) IN (${placeholders.join(", ")})`,
    );
  }
  if (filters.date_from) {
    clauses.push(`${p}${dateColumn} >= :dateFrom`);
    replacements["dateFrom"] = filters.date_from;
  }
  if (filters.date_to) {
    clauses.push(`${p}${dateColumn} <= :dateTo`);
    replacements["dateTo"] = filters.date_to;
  }
  clauses.push(`${p}currency = :currency`);
  replacements["currency"] = filters.currency;
  if (filters.unit) {
    clauses.push(`${p}unit = :unit`);
    replacements["unit"] = filters.unit;
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    replacements,
  };
}

function withScope(
  query: SupplyAnalyticsQuery | DemandAnalyticsQuery | TransactionAnalyticsQuery,
  scope: MarketAccessScope,
): AnalyticsFilters {
  assertStateAllowed(scope, query.state_or_region);
  return {
    ...query,
    allowed_states: scope.allowed_states,
  };
}

const SUPPLY_CTE = `
WITH supply AS (
  SELECT
    pl.id,
    pl.farmer_user_id,
    pl.produce_type_id,
    pt.category_id AS produce_category_id,
    pl.currency,
    pl.unit,
    pl.available_quantity,
    pl.reserved_quantity,
    pl.sold_quantity,
    pl.price_per_unit,
    pl.country,
    pl.state_or_region,
    pl.local_government_area,
    pl.created_at::date AS observed_at
  FROM produce_listings pl
  JOIN produce_types pt ON pt.id = pl.produce_type_id
  WHERE pl.status = 'published'
    AND pl.available_quantity > 0
    AND (pl.expiry_date IS NULL OR pl.expiry_date >= CURRENT_DATE)
)
`;

function mapSupplyGroup(row: Row): SupplyGroup {
  return {
    produce_type_id: nullableString(row["produce_type_id"]),
    produce_type_name: nullableString(row["produce_type_name"]),
    produce_category_id: nullableString(row["produce_category_id"]),
    produce_category_name: nullableString(row["produce_category_name"]),
    country: nullableString(row["country"]),
    state_or_region: nullableString(row["state_or_region"]),
    local_government_area: nullableString(row["local_government_area"]),
    currency: stringValue(row["currency"]),
    unit: stringValue(row["unit"]),
    active_listing_count: numberValue(row["active_listing_count"]),
    farmer_count: numberValue(row["farmer_count"]),
    total_available_quantity: numberValue(row["total_available_quantity"]),
    total_reserved_quantity: numberValue(row["total_reserved_quantity"]),
    total_sold_quantity: numberValue(row["total_sold_quantity"]),
    average_available_per_listing: numberValue(
      row["average_available_per_listing"],
    ),
    average_asking_price: numberValue(row["average_asking_price"]),
  };
}

const SUPPLY_SUMMARY_SELECT = `
SELECT
  NULL::uuid AS produce_type_id,
  NULL::uuid AS produce_category_id,
  NULL::text AS country,
  NULL::text AS state_or_region,
  NULL::text AS local_government_area,
  currency,
  unit,
  COUNT(*)::int AS active_listing_count,
  COUNT(DISTINCT farmer_user_id)::int AS farmer_count,
  COALESCE(SUM(available_quantity), 0)::numeric AS total_available_quantity,
  COALESCE(SUM(reserved_quantity), 0)::numeric AS total_reserved_quantity,
  COALESCE(SUM(sold_quantity), 0)::numeric AS total_sold_quantity,
  COALESCE(AVG(available_quantity), 0)::numeric AS average_available_per_listing,
  COALESCE(AVG(price_per_unit), 0)::numeric AS average_asking_price
FROM supply
`;

const SUPPLY_PRODUCE_SELECT = `
SELECT
  s.produce_type_id,
  s.produce_category_id,
  NULL::text AS country,
  NULL::text AS state_or_region,
  NULL::text AS local_government_area,
  s.currency,
  s.unit,
  COUNT(*)::int AS active_listing_count,
  COUNT(DISTINCT s.farmer_user_id)::int AS farmer_count,
  COALESCE(SUM(s.available_quantity), 0)::numeric AS total_available_quantity,
  COALESCE(SUM(s.reserved_quantity), 0)::numeric AS total_reserved_quantity,
  COALESCE(SUM(s.sold_quantity), 0)::numeric AS total_sold_quantity,
  COALESCE(AVG(s.available_quantity), 0)::numeric AS average_available_per_listing,
  COALESCE(AVG(s.price_per_unit), 0)::numeric AS average_asking_price
FROM supply s
`;

const SUPPLY_REGION_SELECT = `
SELECT
  NULL::uuid AS produce_type_id,
  NULL::uuid AS produce_category_id,
  s.country,
  s.state_or_region,
  s.local_government_area,
  s.currency,
  s.unit,
  COUNT(*)::int AS active_listing_count,
  COUNT(DISTINCT s.farmer_user_id)::int AS farmer_count,
  COALESCE(SUM(s.available_quantity), 0)::numeric AS total_available_quantity,
  COALESCE(SUM(s.reserved_quantity), 0)::numeric AS total_reserved_quantity,
  COALESCE(SUM(s.sold_quantity), 0)::numeric AS total_sold_quantity,
  COALESCE(AVG(s.available_quantity), 0)::numeric AS average_available_per_listing,
  COALESCE(AVG(s.price_per_unit), 0)::numeric AS average_asking_price
FROM supply s
`;

async function runSupplyQuery(
  select: string,
  groupBy: string,
  orderBy: string,
  filters: AnalyticsFilters,
): Promise<Row[]> {
  const alias = select.includes("FROM supply s") ? "s" : "supply";
  const where = buildWhere(filters, alias, "observed_at");
  const joins = alias === "s"
    ? `LEFT JOIN produce_types pt ON pt.id = s.produce_type_id
       LEFT JOIN produce_categories pc ON pc.id = s.produce_category_id`
    : "";
  const rows = (await sequelize.query(
    `${SUPPLY_CTE}
     ${select}
     ${joins}
     ${where.sql}
     GROUP BY ${groupBy}
     ORDER BY ${orderBy}`,
    {
      replacements: where.replacements,
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];
  return rows;
}

export async function getSupplyAnalytics(
  query: SupplyAnalyticsQuery,
  scope: MarketAccessScope,
): Promise<SupplyAnalytics> {
  const filters = withScope(query, scope);
  const [summaryRows, produceRows, regionRows] = await Promise.all([
    runSupplyQuery(
      SUPPLY_SUMMARY_SELECT,
      "currency, unit",
      "active_listing_count DESC, currency ASC, unit ASC",
      filters,
    ),
    runSupplyQuery(
      SUPPLY_PRODUCE_SELECT,
      "s.produce_type_id, s.produce_category_id, s.currency, s.unit, pt.name, pc.name",
      "pt.name ASC NULLS LAST, s.currency ASC, s.unit ASC",
      filters,
    ),
    runSupplyQuery(
      SUPPLY_REGION_SELECT,
      "s.country, s.state_or_region, s.local_government_area, s.currency, s.unit",
      "s.country ASC NULLS LAST, s.state_or_region ASC NULLS LAST, s.local_government_area ASC NULLS LAST, s.currency ASC, s.unit ASC",
      filters,
    ),
  ]);

  const summaryGroups = summaryRows.map(mapSupplyGroup);
  return {
    as_of: new Date().toISOString(),
    summary: summaryGroups.length === 1 ? summaryRows[0] ? mapSupplyGroup(summaryRows[0]) : null : null,
    groups: summaryGroups,
    by_produce_type: produceRows.map(mapSupplyGroup),
    by_region: regionRows.map(mapSupplyGroup),
  };
}

const DEMAND_CTE = `
WITH demand AS (
  SELECT
    br.id,
    br.buyer_user_id,
    br.produce_type_id,
    COALESCE(br.produce_category_id, pt.category_id) AS produce_category_id,
    br.currency,
    br.unit,
    br.requested_quantity,
    br.target_price_per_unit,
    br.country,
    br.state_or_region,
    br.local_government_area,
    br.created_at::date AS observed_at
  FROM buyer_requests br
  LEFT JOIN produce_types pt ON pt.id = br.produce_type_id
  WHERE br.status = 'open'
    AND br.expiry_date >= CURRENT_DATE
)
`;

function mapDemandGroup(row: Row): DemandGroup {
  return {
    produce_type_id: nullableString(row["produce_type_id"]),
    produce_type_name: nullableString(row["produce_type_name"]),
    produce_category_id: nullableString(row["produce_category_id"]),
    produce_category_name: nullableString(row["produce_category_name"]),
    country: nullableString(row["country"]),
    state_or_region: nullableString(row["state_or_region"]),
    local_government_area: nullableString(row["local_government_area"]),
    currency: stringValue(row["currency"]),
    unit: stringValue(row["unit"]),
    active_request_count: numberValue(row["active_request_count"]),
    buyer_count: numberValue(row["buyer_count"]),
    total_requested_quantity: numberValue(row["total_requested_quantity"]),
    average_target_price: nullableNumber(row["average_target_price"]),
  };
}

const DEMAND_SUMMARY_SELECT = `
SELECT
  NULL::uuid AS produce_type_id,
  NULL::uuid AS produce_category_id,
  NULL::text AS country,
  NULL::text AS state_or_region,
  NULL::text AS local_government_area,
  currency,
  unit,
  COUNT(*)::int AS active_request_count,
  COUNT(DISTINCT buyer_user_id)::int AS buyer_count,
  COALESCE(SUM(requested_quantity), 0)::numeric AS total_requested_quantity,
  AVG(target_price_per_unit)::numeric AS average_target_price
FROM demand
`;

const DEMAND_PRODUCE_SELECT = `
SELECT
  d.produce_type_id,
  d.produce_category_id,
  NULL::text AS country,
  NULL::text AS state_or_region,
  NULL::text AS local_government_area,
  d.currency,
  d.unit,
  COUNT(*)::int AS active_request_count,
  COUNT(DISTINCT d.buyer_user_id)::int AS buyer_count,
  COALESCE(SUM(d.requested_quantity), 0)::numeric AS total_requested_quantity,
  AVG(d.target_price_per_unit)::numeric AS average_target_price
FROM demand d
`;

const DEMAND_REGION_SELECT = `
SELECT
  NULL::uuid AS produce_type_id,
  NULL::uuid AS produce_category_id,
  d.country,
  d.state_or_region,
  d.local_government_area,
  d.currency,
  d.unit,
  COUNT(*)::int AS active_request_count,
  COUNT(DISTINCT d.buyer_user_id)::int AS buyer_count,
  COALESCE(SUM(d.requested_quantity), 0)::numeric AS total_requested_quantity,
  AVG(d.target_price_per_unit)::numeric AS average_target_price
FROM demand d
`;

async function runDemandQuery(
  select: string,
  groupBy: string,
  orderBy: string,
  filters: AnalyticsFilters,
): Promise<Row[]> {
  const alias = select.includes("FROM demand d") ? "d" : "demand";
  const where = buildWhere(filters, alias, "observed_at");
  const joins = alias === "d"
    ? `LEFT JOIN produce_types pt ON pt.id = d.produce_type_id
       LEFT JOIN produce_categories pc ON pc.id = d.produce_category_id`
    : "";
  return (await sequelize.query(
    `${DEMAND_CTE}
     ${select}
     ${joins}
     ${where.sql}
     GROUP BY ${groupBy}
     ORDER BY ${orderBy}`,
    {
      replacements: where.replacements,
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];
}

export async function getDemandAnalytics(
  query: DemandAnalyticsQuery,
  scope: MarketAccessScope,
): Promise<DemandAnalytics> {
  const filters = withScope(query, scope);
  const [summaryRows, produceRows, regionRows] = await Promise.all([
    runDemandQuery(
      DEMAND_SUMMARY_SELECT,
      "currency, unit",
      "active_request_count DESC, currency ASC, unit ASC",
      filters,
    ),
    runDemandQuery(
      DEMAND_PRODUCE_SELECT,
      "d.produce_type_id, d.produce_category_id, d.currency, d.unit, pt.name, pc.name",
      "pt.name ASC NULLS LAST, d.currency ASC, d.unit ASC",
      filters,
    ),
    runDemandQuery(
      DEMAND_REGION_SELECT,
      "d.country, d.state_or_region, d.local_government_area, d.currency, d.unit",
      "d.country ASC NULLS LAST, d.state_or_region ASC NULLS LAST, d.local_government_area ASC NULLS LAST, d.currency ASC, d.unit ASC",
      filters,
    ),
  ]);

  const summaryGroups = summaryRows.map(mapDemandGroup);
  return {
    as_of: new Date().toISOString(),
    summary:
      summaryGroups.length === 1
        ? summaryRows[0]
          ? mapDemandGroup(summaryRows[0])
          : null
        : null,
    groups: summaryGroups,
    by_produce_type: produceRows.map(mapDemandGroup),
    by_region: regionRows.map(mapDemandGroup),
  };
}

const TRANSACTION_CTE = `
WITH refund_totals AS (
  SELECT order_id, COALESCE(SUM(amount), 0)::numeric AS refund_minor
  FROM refunds
  WHERE status = 'processed'
  GROUP BY order_id
),
transactions AS (
  SELECT
    o.id,
    o.buyer_id,
    o.farmer_id,
    o.currency,
    o.unit,
    o.quantity,
    o.total_amount,
    COALESCE(r.refund_minor, 0) AS refund_minor,
    pl.produce_type_id,
    pt.category_id AS produce_category_id,
    pl.country,
    pl.state_or_region,
    pl.local_government_area,
    COALESCE(o.completed_at, o.paid_at, o.created_at)::date AS observed_at
  FROM orders o
  LEFT JOIN produce_listings pl ON pl.id = o.listing_id
  LEFT JOIN produce_types pt ON pt.id = pl.produce_type_id
  LEFT JOIN refund_totals r ON r.order_id = o.id
  WHERE o.status = 'completed'
    AND o.payment_status IN ('paid', 'partially_refunded')
)
`;

function mapTransactionGroup(row: Row): TransactionGroup {
  return {
    produce_type_id: nullableString(row["produce_type_id"]),
    produce_type_name: nullableString(row["produce_type_name"]),
    produce_category_id: nullableString(row["produce_category_id"]),
    produce_category_name: nullableString(row["produce_category_name"]),
    country: nullableString(row["country"]),
    state_or_region: nullableString(row["state_or_region"]),
    local_government_area: nullableString(row["local_government_area"]),
    currency: stringValue(row["currency"]),
    unit: stringValue(row["unit"]),
    transaction_count: numberValue(row["transaction_count"]),
    buyer_count: numberValue(row["buyer_count"]),
    farmer_count: numberValue(row["farmer_count"]),
    total_quantity: numberValue(row["total_quantity"]),
    gross_revenue: numberValue(row["gross_revenue"]),
    refund_amount: numberValue(row["refund_amount"]),
    net_revenue: numberValue(row["net_revenue"]),
    average_order_value: numberValue(row["average_order_value"]),
  };
}

const TRANSACTION_METRICS = `
  COUNT(*)::int AS transaction_count,
  COUNT(DISTINCT buyer_id)::int AS buyer_count,
  COUNT(DISTINCT farmer_id)::int AS farmer_count,
  COALESCE(SUM(quantity), 0)::numeric AS total_quantity,
  COALESCE(SUM(total_amount), 0)::numeric AS gross_revenue,
  COALESCE(SUM(refund_minor / 100.0), 0)::numeric AS refund_amount,
  COALESCE(SUM(total_amount - refund_minor / 100.0), 0)::numeric AS net_revenue,
  COALESCE(AVG(total_amount - refund_minor / 100.0), 0)::numeric AS average_order_value
`;

const TRANSACTION_SUMMARY_SELECT = `
SELECT
  NULL::uuid AS produce_type_id,
  NULL::uuid AS produce_category_id,
  NULL::text AS country,
  NULL::text AS state_or_region,
  NULL::text AS local_government_area,
  currency,
  unit,
  ${TRANSACTION_METRICS}
FROM transactions
`;

const TRANSACTION_PRODUCE_SELECT = `
SELECT
  t.produce_type_id,
  t.produce_category_id,
  NULL::text AS country,
  NULL::text AS state_or_region,
  NULL::text AS local_government_area,
  t.currency,
  t.unit,
  ${TRANSACTION_METRICS}
FROM transactions t
`;

const TRANSACTION_REGION_SELECT = `
SELECT
  NULL::uuid AS produce_type_id,
  NULL::uuid AS produce_category_id,
  t.country,
  t.state_or_region,
  t.local_government_area,
  t.currency,
  t.unit,
  ${TRANSACTION_METRICS}
FROM transactions t
`;

async function runTransactionQuery(
  select: string,
  groupBy: string,
  orderBy: string,
  filters: AnalyticsFilters,
): Promise<Row[]> {
  const alias = select.includes("FROM transactions t") ? "t" : "transactions";
  const where = buildWhere(filters, alias, "observed_at");
  const joins = alias === "t"
    ? `LEFT JOIN produce_types pt ON pt.id = t.produce_type_id
       LEFT JOIN produce_categories pc ON pc.id = t.produce_category_id`
    : "";
  return (await sequelize.query(
    `${TRANSACTION_CTE}
     ${select}
     ${joins}
     ${where.sql}
     GROUP BY ${groupBy}
     ORDER BY ${orderBy}`,
    {
      replacements: where.replacements,
      type: QueryTypes.SELECT,
    },
  )) as unknown as Row[];
}

export async function getTransactionAnalytics(
  query: TransactionAnalyticsQuery,
  scope: MarketAccessScope,
): Promise<TransactionAnalytics> {
  const filters = withScope(query, scope);
  const [summaryRows, produceRows, regionRows, trendRows] = await Promise.all([
    runTransactionQuery(
      TRANSACTION_SUMMARY_SELECT,
      "currency, unit",
      "transaction_count DESC, currency ASC, unit ASC",
      filters,
    ),
    runTransactionQuery(
      TRANSACTION_PRODUCE_SELECT,
      "t.produce_type_id, t.produce_category_id, t.currency, t.unit, pt.name, pc.name",
      "pt.name ASC NULLS LAST, t.currency ASC, t.unit ASC",
      filters,
    ),
    runTransactionQuery(
      TRANSACTION_REGION_SELECT,
      "t.country, t.state_or_region, t.local_government_area, t.currency, t.unit",
      "t.country ASC NULLS LAST, t.state_or_region ASC NULLS LAST, t.local_government_area ASC NULLS LAST, t.currency ASC, t.unit ASC",
      filters,
    ),
    (async () => {
      const where = buildWhere(filters, "transactions", "observed_at");
      return (await sequelize.query(
        `${TRANSACTION_CTE}
         SELECT
           date_trunc(:period, observed_at::timestamp)::date AS period,
           currency,
           unit,
           COUNT(*)::int AS transaction_count,
           COALESCE(SUM(quantity), 0)::numeric AS total_quantity,
           COALESCE(SUM(total_amount), 0)::numeric AS gross_revenue,
           COALESCE(SUM(refund_minor / 100.0), 0)::numeric AS refund_amount,
           COALESCE(SUM(total_amount - refund_minor / 100.0), 0)::numeric AS net_revenue
         FROM transactions
         ${where.sql}
         GROUP BY 1, currency, unit
         ORDER BY 1 ASC, currency ASC, unit ASC`,
        {
          replacements: { ...where.replacements, period: query.period },
          type: QueryTypes.SELECT,
        },
      )) as unknown as Row[];
    })(),
  ]);

  const summaryGroups = summaryRows.map(mapTransactionGroup);
  return {
    as_of: new Date().toISOString(),
    summary:
      summaryGroups.length === 1
        ? summaryRows[0]
          ? mapTransactionGroup(summaryRows[0])
          : null
        : null,
    groups: summaryGroups,
    by_produce_type: produceRows.map(mapTransactionGroup),
    by_region: regionRows.map(mapTransactionGroup),
    trend: trendRows.map((row) => ({
      period: String(row["period"]).slice(0, 10),
      currency: stringValue(row["currency"]),
      unit: stringValue(row["unit"]),
      transaction_count: numberValue(row["transaction_count"]),
      total_quantity: numberValue(row["total_quantity"]),
      gross_revenue: numberValue(row["gross_revenue"]),
      refund_amount: numberValue(row["refund_amount"]),
      net_revenue: numberValue(row["net_revenue"]),
    })),
  };
}

export function analyticsDefaultWindow(): number {
  return env.MARKET_ANALYTICS_DEFAULT_WINDOW_DAYS;
}
