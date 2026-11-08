import type { DeliveryStatus } from "../../database/models/delivery.model.js";

export interface DeliveryUserSummary {
  id: string;
  display_name: string | null;
}

export interface DeliveryOrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  quantity: number;
  unit: string;
  total_amount: number;
  currency: string;
  delivery_location: string | null;
  delivery_date: string | null;
}

export interface DeliveryData {
  id: string;
  delivery_reference: string;
  order_id: string;
  farmer_id: string;
  buyer_id: string;
  transporter_id: string | null;
  pickup_location: string;
  delivery_location: string;
  produce_description: string;
  quantity: number;
  unit: string;
  expected_pickup_date: string;
  expected_delivery_date: string;
  delivery_fee_minor: number;
  delivery_fee: number;
  currency: string;
  additional_instructions: string | null;
  status: DeliveryStatus;
  created_by_user_id: string | null;
  assigned_at: Date | null;
  accepted_at: Date | null;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  failed_at: Date | null;
  cancellation_reason: string | null;
  failure_reason: string | null;
  order?: DeliveryOrderSummary;
  buyer?: DeliveryUserSummary;
  farmer?: DeliveryUserSummary;
  transporter?: DeliveryUserSummary;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryHistoryEventData {
  id: string;
  delivery_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  description: string | null;
  location: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface DeliveryHistoryData {
  delivery_id: string;
  events: DeliveryHistoryEventData[];
}

export interface PaginatedDeliveries {
  deliveries: DeliveryData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
