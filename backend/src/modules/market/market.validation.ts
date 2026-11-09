import { z } from "zod";
import { env } from "../../config/env.js";

const uuid = z.string().uuid("Must be a valid UUID.");
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");
const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO currency code.");
const unit = z
  .string()
  .trim()
  .min(1, "Unit is required.")
  .max(50, "Unit must be at most 50 characters.");
const location = (max: number) =>
  z.string().trim().max(max).optional();

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const produceFilter = {
  produce_type_id: uuid.optional(),
  produce_category_id: uuid.optional(),
};

const locationFilter = {
  country: location(100),
  state_or_region: location(150),
  local_government_area: location(150),
};

const dateRange = {
  date_from: dateOnly.optional(),
  date_to: dateOnly.optional(),
};

function validDateRange(value: { date_from?: string; date_to?: string }): boolean {
  return (
    value.date_from === undefined ||
    value.date_to === undefined ||
    value.date_from <= value.date_to
  );
}

const dateRangeRefinement = {
  message: "date_from must not be after date_to.",
  path: ["date_from"],
};

const priceSource = z.enum([
  "marketplace_listing",
  "completed_transaction",
  "verified_market_observation",
  "approved_external_source",
]);

const pricePeriod = z.enum(["day", "week", "month"]);

export const MarketIdSchema = uuid;

export const PriceListQuerySchema = z
  .object({
    ...pagination,
    ...produceFilter,
    ...locationFilter,
    ...dateRange,
    currency: currency.default(env.MARKET_DEFAULT_CURRENCY),
    unit: unit.optional(),
    source: priceSource.optional(),
    sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).default("newest"),
  })
  .refine(validDateRange, dateRangeRefinement);

export const PriceTrendQuerySchema = z
  .object({
    ...produceFilter,
    ...locationFilter,
    ...dateRange,
    currency: currency.default(env.MARKET_DEFAULT_CURRENCY),
    unit,
    period: pricePeriod.default("month"),
  })
  .refine(validDateRange, dateRangeRefinement);

function commaList(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export const PriceCompareQuerySchema = z
  .object({
    ...produceFilter,
    ...locationFilter,
    ...dateRange,
    produce_type_ids: z.preprocess(commaList, z.array(uuid).min(1).max(10).optional()),
    produce_category_ids: z.preprocess(
      commaList,
      z.array(uuid).min(1).max(10).optional(),
    ),
    state_or_regions: z.preprocess(
      commaList,
      z.array(z.string().trim().min(1).max(150)).min(1).max(10).optional(),
    ),
    currency: currency.default(env.MARKET_DEFAULT_CURRENCY),
    unit,
  })
  .refine(validDateRange, dateRangeRefinement)
  .refine(
    (value) =>
      value.produce_type_ids !== undefined ||
      value.produce_category_ids !== undefined ||
      value.state_or_regions !== undefined ||
      value.produce_type_id !== undefined ||
      value.produce_category_id !== undefined ||
      value.state_or_region !== undefined,
    {
      message:
        "Provide at least one produce or region filter to compare market prices.",
      path: ["produce_type_ids"],
    },
  );

export const SupplyAnalyticsQuerySchema = z
  .object({
    ...produceFilter,
    ...locationFilter,
    ...dateRange,
    currency: currency.default(env.MARKET_DEFAULT_CURRENCY),
    unit: unit.optional(),
  })
  .refine(validDateRange, dateRangeRefinement);

export const DemandAnalyticsQuerySchema = SupplyAnalyticsQuerySchema;

export const TransactionAnalyticsQuerySchema = z
  .object({
    ...produceFilter,
    ...locationFilter,
    ...dateRange,
    currency: currency.default(env.MARKET_DEFAULT_CURRENCY),
    unit: unit.optional(),
    period: pricePeriod.default("month"),
  })
  .refine(validDateRange, dateRangeRefinement);

export const CreateMarketObservationSchema = z
  .object({
    produce_type_id: uuid.optional(),
    produce_category_id: uuid.optional(),
    cooperative_id: uuid.optional(),
    market_name: z.string().trim().max(200).nullish(),
    price_per_unit: z.coerce
      .number()
      .finite("Price must be a finite number.")
      .positive("Price must be greater than zero."),
    currency: currency.default(env.MARKET_DEFAULT_CURRENCY),
    unit,
    grade: z.string().trim().max(100).nullish(),
    variety: z.string().trim().max(150).nullish(),
    quantity: z.coerce
      .number()
      .finite()
      .positive("Quantity must be greater than zero.")
      .nullish(),
    country: location(100),
    state_or_region: location(150),
    local_government_area: location(150),
    community: location(150),
    observed_at: dateOnly,
    notes: z.string().trim().max(2000).nullish(),
  })
  .strict()
  .refine(
    (value) =>
      value.produce_type_id !== undefined ||
      value.produce_category_id !== undefined,
    {
      message: "Provide either produce_type_id or produce_category_id.",
      path: ["produce_type_id"],
    },
  );

export const MyObservationsQuerySchema = z
  .object({
    ...pagination,
    ...produceFilter,
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    ...dateRange,
  })
  .refine(validDateRange, dateRangeRefinement);

export const AdminObservationsQuerySchema = z
  .object({
    ...pagination,
    ...produceFilter,
    ...dateRange,
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    submitted_by_user_id: uuid.optional(),
    cooperative_id: uuid.optional(),
  })
  .refine(validDateRange, dateRangeRefinement);

export const ApproveObservationSchema = z
  .object({
    notes: z.string().trim().max(2000).nullish(),
  })
  .strict()
  .default({});

export const RejectObservationSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3, "Provide a rejection reason with at least 3 characters.")
      .max(2000),
  })
  .strict();

export const InsightListQuerySchema = z
  .object({
    ...pagination,
    ...produceFilter,
    ...locationFilter,
    type: z
      .enum([
        "price_increase",
        "price_decrease",
        "price_volatility",
        "supply_shortage",
        "supply_surplus",
        "demand_increase",
        "demand_decrease",
      ])
      .optional(),
    severity: z.enum(["low", "medium", "high"]).optional(),
    status: z.enum(["active", "expired", "dismissed"]).default("active"),
    currency: currency.optional(),
    unit: unit.optional(),
  });

export const GenerateInsightsSchema = z
  .object({
    produce_type_id: uuid.optional(),
    produce_category_id: uuid.optional(),
    ...locationFilter,
    currency: currency.default(env.MARKET_DEFAULT_CURRENCY),
    unit: unit.default("kg"),
    date_from: dateOnly.optional(),
    date_to: dateOnly.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.produce_type_id !== undefined ||
      value.produce_category_id !== undefined,
    {
      message: "Provide either produce_type_id or produce_category_id.",
      path: ["produce_type_id"],
    },
  )
  .refine(validDateRange, dateRangeRefinement);

export type PriceListQuery = z.infer<typeof PriceListQuerySchema>;
export type PriceTrendQuery = z.infer<typeof PriceTrendQuerySchema>;
export type PriceCompareQuery = z.infer<typeof PriceCompareQuerySchema>;
export type SupplyAnalyticsQuery = z.infer<typeof SupplyAnalyticsQuerySchema>;
export type DemandAnalyticsQuery = z.infer<typeof DemandAnalyticsQuerySchema>;
export type TransactionAnalyticsQuery = z.infer<
  typeof TransactionAnalyticsQuerySchema
>;
export type CreateMarketObservationInput = z.infer<
  typeof CreateMarketObservationSchema
>;
export type MyObservationsQuery = z.infer<typeof MyObservationsQuerySchema>;
export type AdminObservationsQuery = z.infer<
  typeof AdminObservationsQuerySchema
>;
export type ApproveObservationInput = z.infer<
  typeof ApproveObservationSchema
>;
export type RejectObservationInput = z.infer<
  typeof RejectObservationSchema
>;
export type InsightListQuery = z.infer<typeof InsightListQuerySchema>;
export type GenerateInsightsInput = z.infer<typeof GenerateInsightsSchema>;
