import { NotificationPreference } from "../../database/models/index.js";
import type {
  NotificationPreferenceData,
  NotificationType,
} from "./notifications.types.js";

export interface UpdateNotificationPreferencesInput {
  in_app_enabled?: boolean;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  offers_enabled?: boolean;
  messages_enabled?: boolean;
  orders_enabled?: boolean;
  payments_enabled?: boolean;
  deliveries_enabled?: boolean;
  reviews_enabled?: boolean;
  verifications_enabled?: boolean;
  marketing_enabled?: boolean;
}

export function buildNotificationPreferenceData(
  row: NotificationPreference,
): NotificationPreferenceData {
  return {
    user_id: row.user_id,
    in_app_enabled: row.in_app_enabled,
    email_enabled: row.email_enabled,
    sms_enabled: row.sms_enabled,
    offers_enabled: row.offers_enabled,
    messages_enabled: row.messages_enabled,
    orders_enabled: row.orders_enabled,
    payments_enabled: row.payments_enabled,
    deliveries_enabled: row.deliveries_enabled,
    reviews_enabled: row.reviews_enabled,
    verifications_enabled: row.verifications_enabled,
    marketing_enabled: row.marketing_enabled,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

export async function getOrCreateNotificationPreferences(
  userId: string,
): Promise<NotificationPreference> {
  const [preference] = await NotificationPreference.findOrCreate({
    where: { user_id: userId },
    defaults: { user_id: userId },
  });
  return preference;
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferenceData> {
  return buildNotificationPreferenceData(
    await getOrCreateNotificationPreferences(userId),
  );
}

export async function updateNotificationPreferences(
  userId: string,
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferenceData> {
  const preference = await getOrCreateNotificationPreferences(userId);
  await preference.update(input);
  return buildNotificationPreferenceData(preference);
}

export function isCategoryEnabled(
  preference: NotificationPreference,
  type: NotificationType,
): boolean {
  switch (type) {
    case "new_offer":
    case "offer_accepted":
    case "offer_rejected":
    case "counter_offer_received":
    case "offer_withdrawn":
    case "offer_expired":
      return preference.offers_enabled;
    case "new_message":
      return preference.messages_enabled;
    case "order_created":
    case "order_cancelled":
    case "reservation_expiring":
    case "reservation_expired":
      return preference.orders_enabled;
    case "payment_successful":
    case "payment_failed":
    case "refund_confirmed":
      return preference.payments_enabled;
    case "delivery_assigned":
    case "delivery_accepted":
    case "delivery_declined":
    case "delivery_picked_up":
    case "delivery_in_transit":
    case "delivery_delivered":
    case "delivery_completed":
    case "delivery_failed":
    case "delivery_cancelled":
      return preference.deliveries_enabled;
    case "new_review":
    case "review_reported":
    case "review_hidden":
    case "review_restored":
    case "review_report_resolved":
    case "review_report_dismissed":
      return preference.reviews_enabled;
    case "verification_submitted":
    case "verification_approved":
    case "verification_rejected":
      return preference.verifications_enabled;
    case "account_verified":
    case "system_announcement":
      return true;
    case "marketing":
      return preference.marketing_enabled;
  }
}

const ALWAYS_IN_APP_TYPES: ReadonlySet<NotificationType> = new Set([
  "account_verified",
  "payment_successful",
  "payment_failed",
  "reservation_expiring",
  "reservation_expired",
]);

export function isAlwaysInApp(type: NotificationType): boolean {
  return ALWAYS_IN_APP_TYPES.has(type);
}

export function isMarketingType(type: NotificationType): boolean {
  return type === "marketing";
}
