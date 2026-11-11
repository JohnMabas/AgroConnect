import type { NotificationChannel } from "../../database/models/notification.model.js";
import type { NotificationDeliveryStatus } from "../../database/models/notification-delivery.model.js";

export type NotificationType =
  | "new_offer"
  | "offer_accepted"
  | "offer_rejected"
  | "counter_offer_received"
  | "offer_withdrawn"
  | "offer_expired"
  | "new_message"
  | "order_created"
  | "order_cancelled"
  | "payment_successful"
  | "payment_failed"
  | "reservation_expiring"
  | "reservation_expired"
  | "refund_confirmed"
  | "delivery_assigned"
  | "delivery_accepted"
  | "delivery_declined"
  | "delivery_picked_up"
  | "delivery_in_transit"
  | "delivery_delivered"
  | "delivery_completed"
  | "delivery_failed"
  | "delivery_cancelled"
  | "account_verified"
  | "new_review"
  | "review_reported"
  | "review_hidden"
  | "review_restored"
  | "review_report_resolved"
  | "review_report_dismissed"
  | "verification_submitted"
  | "verification_approved"
  | "verification_rejected"
  | "market_observation_submitted"
  | "market_observation_approved"
  | "market_observation_rejected"
  | "agent_invited"
  | "agent_verification_approved"
  | "agent_verification_rejected"
  | "agent_relationship_requested"
  | "agent_relationship_approved"
  | "agent_relationship_revoked"
  | "action_approval_requested"
  | "action_approved"
  | "action_rejected"
  | "action_approval_expired"
  | "complaint_submitted"
  | "complaint_status_updated"
  | "complaint_resolved"
  | "system_announcement"
  | "marketing";

export interface NotificationTemplateVariables {
  recipient_name?: string | null;
  actor_name?: string | null;
  title?: string | null;
  message?: string | null;
  offer_number?: string | null;
  order_number?: string | null;
  delivery_reference?: string | null;
  amount?: number | null;
  currency?: string | null;
  quantity?: number | null;
  unit?: string | null;
  reason?: string | null;
  verification_method?: "email" | "phone" | null;
  verification_type?: string | null;
  rating?: number | null;
  report_reason?: string | null;
  review_title?: string | null;
  produce_name?: string | null;
  market_name?: string | null;
  complaint_number?: string | null;
  action_type?: string | null;
  approval_id?: string | null;
  action_url?: string | null;
}

export interface RenderedNotification {
  title: string;
  message: string;
  email_subject: string;
  email_text: string;
  email_html: string;
  sms_body: string;
}

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  channel: NotificationChannel;
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationDeliveryData {
  id: string;
  notification_id: string;
  user_id: string;
  channel: NotificationChannel;
  provider: string;
  provider_reference: string | null;
  delivery_status: NotificationDeliveryStatus;
  attempts: number;
  last_attempt_at: Date | null;
  next_attempt_at: Date | null;
  delivered_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreferenceData {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  offers_enabled: boolean;
  messages_enabled: boolean;
  orders_enabled: boolean;
  payments_enabled: boolean;
  deliveries_enabled: boolean;
  reviews_enabled: boolean;
  verifications_enabled: boolean;
  marketing_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedNotifications {
  notifications: NotificationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedNotificationDeliveries {
  deliveries: NotificationDeliveryData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DispatchNotificationInput {
  user_id: string;
  notification_type: NotificationType;
  variables: NotificationTemplateVariables;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  action_url?: string | null;
  dedupe_key: string;
  is_marketing?: boolean;
  allow_external?: boolean;
}
