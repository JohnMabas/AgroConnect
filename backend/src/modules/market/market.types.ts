import type { MarketInsightSeverity, MarketInsightStatus, MarketInsightType } from "../../database/models/market-insight.model.js";
import type { MarketObservationStatus } from "../../database/models/market-observation.model.js";
import type { MarketPriceSource } from "../../database/models/market-price.model.js";

export interface MarketAccessScope {
  user_id: string;
  is_admin: boolean;
  allowed_states: string[] | null;
}

export interface ProduceReferenceSummary {
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  currency: string;
  unit: string;
}

export interface PricePointData {
  source_id: string;
  source_type: MarketPriceSource;
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  price_per_unit: number;
  currency: string;
  unit: string;
  grade: string | null;
  variety: string | null;
  quantity: number | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  community: string | null;
  observed_at: string;
}

export interface PriceSourceBreakdown {
  source_type: MarketPriceSource;
  observation_count: number;
  total_quantity: number;
  average_price: number;
  min_price: number;
  max_price: number;
}

export interface PriceSummary {
  observation_count: number;
  source_count: number;
  total_quantity: number;
  average_price: number;
  min_price: number;
  max_price: number;
  median_price: number;
  standard_deviation: number;
  currency: string;
  unit: string;
  source_breakdown: PriceSourceBreakdown[];
}

export interface PriceGroup extends PriceSummary {
  source_breakdown: PriceSourceBreakdown[];
}

export interface PaginatedPricePoints {
  prices: PricePointData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PriceListResult extends PaginatedPricePoints {
  summary: PriceSummary | null;
  groups: PriceGroup[];
}

export interface PriceTrendPoint {
  period: string;
  observation_count: number;
  average_price: number;
  min_price: number;
  max_price: number;
  median_price: number;
}

export interface PriceTrendResult {
  currency: string;
  unit: string;
  period: "day" | "week" | "month";
  trend: PriceTrendPoint[];
  change_percentage: number | null;
  direction: "rising" | "falling" | "stable" | "insufficient_data";
}

export interface PriceComparisonGroup {
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  currency: string;
  unit: string;
  observation_count: number;
  average_price: number;
  min_price: number;
  max_price: number;
  median_price: number;
}

export interface SupplyGroup {
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  currency: string;
  unit: string;
  active_listing_count: number;
  farmer_count: number;
  total_available_quantity: number;
  total_reserved_quantity: number;
  total_sold_quantity: number;
  average_available_per_listing: number;
  average_asking_price: number;
}

export interface SupplyAnalytics {
  as_of: string;
  summary: SupplyGroup | null;
  groups: SupplyGroup[];
  by_produce_type: SupplyGroup[];
  by_region: SupplyGroup[];
}

export interface DemandGroup {
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  currency: string;
  unit: string;
  active_request_count: number;
  buyer_count: number;
  total_requested_quantity: number;
  average_target_price: number | null;
}

export interface DemandAnalytics {
  as_of: string;
  summary: DemandGroup | null;
  groups: DemandGroup[];
  by_produce_type: DemandGroup[];
  by_region: DemandGroup[];
}

export interface TransactionGroup {
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  currency: string;
  unit: string;
  transaction_count: number;
  buyer_count: number;
  farmer_count: number;
  total_quantity: number;
  gross_revenue: number;
  refund_amount: number;
  net_revenue: number;
  average_order_value: number;
}

export interface TransactionAnalytics {
  as_of: string;
  summary: TransactionGroup | null;
  groups: TransactionGroup[];
  by_produce_type: TransactionGroup[];
  by_region: TransactionGroup[];
  trend: Array<{
    period: string;
    currency: string;
    unit: string;
    transaction_count: number;
    total_quantity: number;
    gross_revenue: number;
    refund_amount: number;
    net_revenue: number;
  }>;
}

export interface MarketObservationData {
  id: string;
  submitted_by_user_id: string;
  cooperative_id: string | null;
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  market_name: string | null;
  price_per_unit: number;
  currency: string;
  unit: string;
  grade: string | null;
  variety: string | null;
  quantity: number | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  community: string | null;
  observed_at: string;
  notes: string | null;
  status: MarketObservationStatus;
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  submitted_by?: { id: string; display_name: string | null };
  reviewed_by?: { id: string; display_name: string | null };
  cooperative?: { id: string; cooperative_name: string };
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedMarketObservations {
  observations: MarketObservationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface MarketInsightData {
  id: string;
  insight_type: MarketInsightType;
  produce_type_id: string | null;
  produce_type_name: string | null;
  produce_category_id: string | null;
  produce_category_name: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  currency: string | null;
  unit: string | null;
  title: string;
  summary: string;
  severity: MarketInsightSeverity;
  metric_value: number | null;
  comparison_value: number | null;
  change_percentage: number | null;
  observation_count: number;
  period_start: string;
  period_end: string;
  status: MarketInsightStatus;
  generated_at: Date;
  expires_at: Date | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedMarketInsights {
  insights: MarketInsightData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface InsightGenerationResult {
  generated: number;
  insights: MarketInsightData[];
}
