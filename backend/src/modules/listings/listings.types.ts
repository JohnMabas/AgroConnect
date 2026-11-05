import type { ProduceCategoryData, ProduceTypeData } from "../produce/produce.types.js";

export type ListingStatus =
  | "draft"
  | "published"
  | "paused"
  | "sold_out"
  | "closed"
  | "expired";

export interface ListingImageData {
  id: string;
  listing_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: Date;
}

export interface PublicFarmerData {
  id: string;
  display_name: string | null;
}

export interface ListingData {
  id: string;
  farmer_user_id: string;
  produce_type_id: string;
  title: string;
  description: string | null;
  variety: string | null;
  grade: string | null;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  unit: string;
  packaging_description: string | null;
  price_per_unit: number;
  currency: string;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  community: string | null;
  collection_location: string | null;
  harvest_date: string | null;
  available_from: string | null;
  expiry_date: string | null;
  status: ListingStatus;
  /** True only while the listing can currently be discovered as sellable. */
  is_available: boolean;
  produce_type?: ProduceTypeData & { category?: ProduceCategoryData };
  farmer?: PublicFarmerData;
  images?: ListingImageData[];
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedListings {
  listings: ListingData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface InventoryAdjustmentData {
  id: string;
  listing_id: string;
  farmer_user_id: string;
  adjustment_type: "stock_added" | "stock_removed" | "correction";
  quantity_change: number;
  previous_available_quantity: number;
  new_available_quantity: number;
  reason: string | null;
  created_at: Date;
}

export interface InventorySummary {
  listing_id: string;
  title: string;
  status: ListingStatus;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  unit: string;
  is_balanced: boolean;
}

export interface PaginatedAdjustments {
  adjustments: InventoryAdjustmentData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
