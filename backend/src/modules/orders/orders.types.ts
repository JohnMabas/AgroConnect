import type {
  OrderPaymentStatus,
  OrderStatus,
} from "../../database/models/order.model.js";
import type { PaymentStatus } from "../../database/models/payment.model.js";
import type { RefundStatus } from "../../database/models/refund.model.js";
import type { ReservationStatus } from "../../database/models/inventory-reservation.model.js";

export interface OrderUserSummary {
  id: string;
  display_name: string | null;
}

export interface OrderListingSummary {
  id: string;
  title: string;
  status: string;
  farmer_user_id: string;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  expiry_date: string | null;
}

export interface OrderItemData {
  id: string;
  order_id: string;
  listing_id: string | null;
  title: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface OrderReservationData {
  id: string;
  order_id: string;
  listing_id: string;
  quantity: number;
  status: ReservationStatus;
  expires_at: Date;
  released_at: Date | null;
  release_reason: string | null;
  is_expired: boolean;
}

export interface OrderEventData {
  id: string;
  order_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface OrderPaymentSummary {
  id: string;
  reference: string;
  provider: string;
  amount_minor: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  authorization_url: string | null;
  access_code: string | null;
  channel: string | null;
  gateway_response: string | null;
  paid_at: Date | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderData {
  id: string;
  order_number: string;
  offer_id: string;
  listing_id: string | null;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  delivery_terms: string | null;
  delivery_location: string | null;
  delivery_date: string | null;
  buyer_message: string | null;
  reservation_expires_at: Date | null;
  paid_at: Date | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
  refunded_at: Date | null;
  cancellation_reason: string | null;
  buyer?: OrderUserSummary;
  farmer?: OrderUserSummary;
  listing?: OrderListingSummary;
  item?: OrderItemData;
  reservation?: OrderReservationData;
  payments?: OrderPaymentSummary[];
  created_at: Date;
  updated_at: Date;
}

export interface RefundData {
  id: string;
  order_id: string;
  payment_id: string;
  requested_by_user_id: string | null;
  provider: string;
  provider_refund_id: string | null;
  transaction_reference: string;
  amount_minor: number;
  amount: number;
  currency: string;
  status: RefundStatus;
  customer_note: string | null;
  merchant_note: string | null;
  processed_at: Date | null;
  failed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedOrders {
  orders: OrderData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface OrderHistory {
  order_id: string;
  events: OrderEventData[];
}

export interface PaginatedReservations {
  reservations: OrderReservationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
