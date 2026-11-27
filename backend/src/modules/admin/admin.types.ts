export interface AdminOverviewData {
  total_users: number;
  total_farmers: number;
  total_buyers: number;
  registered_cooperatives: number;
  approved_transporters: number;
  pending_transporters: number;
  pending_cooperatives: number;
  active_listings: number;
  active_buyer_requests: number;
  total_orders: number;
  successful_payments: number;
  pending_payments: number;
  recorded_platform_commission_minor: number;
  platform_commission_currency: string;
  active_deliveries: number;
  pending_complaints: number;
  open_integrity_alerts: number;
}

export interface AdminUserSummary {
  id: string;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  status: string;
  roles: string[];
  created_at: Date;
}

export interface AdminUserProfileSummary {
  first_name: string | null;
  last_name: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  city_or_community: string | null;
}

export interface AdminUserDetail extends AdminUserSummary {
  email_verified: boolean;
  phone_verified: boolean;
  profile: AdminUserProfileSummary | null;
  farmer_verification_status: string | null;
  last_updated: Date | null;
}

export interface PaginatedAdminUsers {
  users: AdminUserSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminTransporterSummary {
  id: string;
  user_id: string;
  business_name: string;
  contact_phone: string;
  operating_location: string;
  coverage_areas: string[];
  vehicle_type: string | null;
  vehicle_registration_number: string | null;
  vehicle_capacity: string | null;
  produce_types: string[];
  availability_status: string;
  approval_status: string;
  approved_at: Date | null;
  suspended_reason: string | null;
  user_display_name: string | null;
  user_email: string | null;
  user_phone_number: string | null;
  created_at: Date;
}

export interface PaginatedAdminTransporters {
  transporters: AdminTransporterSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminListingSummary {
  id: string;
  title: string;
  status: string;
  farmer_user_id: string;
  farmer_display_name: string | null;
  produce_type_name: string | null;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  state_or_region: string | null;
  community: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedAdminListings {
  listings: AdminListingSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminPaymentSummary {
  id: string;
  order_id: string;
  order_number: string | null;
  buyer_display_name: string | null;
  farmer_display_name: string | null;
  reference: string;
  provider: string;
  amount_minor: number;
  amount: number;
  currency: string;
  status: string;
  channel: string | null;
  gateway_response: string | null;
  paid_at: Date | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminPaymentsData {
  payments: AdminPaymentSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  summary: {
    successful: number;
    pending: number;
    failed: number;
    refunded: number;
    successful_amount_minor: number;
    currency: string;
  };
}

export interface AdminAuditLogData {
  id: string;
  admin_user_id: string | null;
  admin_display_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  result: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface PaginatedAdminAuditLogs {
  logs: AdminAuditLogData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
