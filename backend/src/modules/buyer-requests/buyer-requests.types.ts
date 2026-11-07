import type {
  ProduceCategoryData,
  ProduceTypeData,
} from "../produce/produce.types.js";

export type BuyerRequestStatus =
  | "open"
  | "paused"
  | "fulfilled"
  | "cancelled"
  | "expired";

export interface PublicBuyerData {
  id: string;
  display_name: string | null;
}

export interface BuyerRequestData {
  id: string;
  buyer_user_id: string;
  produce_type_id: string | null;
  produce_category_id: string | null;
  requested_quantity: number;
  unit: string;
  preferred_location: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  community: string | null;
  target_price_per_unit: number | null;
  currency: string;
  additional_requirements: string | null;
  required_delivery_date: string | null;
  expiry_date: string;
  status: BuyerRequestStatus;
  /** True only while the request is open and has not passed its expiry date. */
  is_active: boolean;
  produce_type?: ProduceTypeData & { category?: ProduceCategoryData };
  produce_category?: ProduceCategoryData;
  buyer?: PublicBuyerData;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedBuyerRequests {
  requests: BuyerRequestData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
