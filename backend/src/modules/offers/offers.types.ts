import type { OfferStatus } from "../../database/models/offer.model.js";

export interface OfferUserSummary {
  id: string;
  display_name: string | null;
}

export interface OfferListingSummary {
  id: string;
  title: string;
  status: string;
  farmer_user_id: string;
  available_quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
}

export interface OfferBuyerRequestSummary {
  id: string;
  status: string;
  buyer_user_id: string;
  requested_quantity: number;
  unit: string;
  currency: string;
  expiry_date: string;
}

export interface OfferData {
  id: string;
  offer_number: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  conversation_id: string | null;
  buyer_id: string;
  farmer_id: string;
  created_by: string;
  recipient_user_id: string;
  parent_offer_id: string | null;
  root_offer_id: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  delivery_terms: string | null;
  delivery_location: string | null;
  delivery_date: string | null;
  buyer_message: string | null;
  status: OfferStatus;
  expires_at: Date;
  accepted_at: Date | null;
  rejected_at: Date | null;
  withdrawn_at: Date | null;
  expired_at: Date | null;
  countered_at: Date | null;
  buyer?: OfferUserSummary;
  farmer?: OfferUserSummary;
  listing?: OfferListingSummary;
  buyer_request?: OfferBuyerRequestSummary;
  created_at: Date;
  updated_at: Date;
}

export interface OfferEventData {
  id: string;
  offer_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface PaginatedOffers {
  offers: OfferData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface OfferHistory {
  root_offer_id: string;
  offers: OfferData[];
  events: OfferEventData[];
}
