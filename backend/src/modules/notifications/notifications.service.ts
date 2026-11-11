import { Op, type WhereOptions } from "sequelize";
import { env } from "../../config/env.js";
import {
  InventoryReservation,
  Notification,
  NotificationDelivery,
  Order,
  User,
  sequelize,
} from "../../database/models/index.js";
import type {
  NotificationDeliveryStatus,
} from "../../database/models/notification-delivery.model.js";
import type { NotificationChannel } from "../../database/models/notification.model.js";
import { getEmailProvider } from "../../integrations/email/index.js";
import { getSmsProvider } from "../../integrations/sms/index.js";
import { emitToUser } from "../../realtime/registry.js";
import {
  buildNotificationPreferenceData,
  getOrCreateNotificationPreferences,
  isAlwaysInApp,
  isCategoryEnabled,
  isMarketingType,
  updateNotificationPreferences,
  type UpdateNotificationPreferencesInput,
} from "./notifications.preferences.service.js";
import {
  buildChannelContent,
  renderNotificationTemplate,
} from "./notifications.templates.js";
import type {
  DispatchNotificationInput,
  NotificationData,
  NotificationDeliveryData,
  NotificationPreferenceData,
  NotificationType,
  PaginatedNotificationDeliveries,
  PaginatedNotifications,
} from "./notifications.types.js";

const ALWAYS_IN_APP: NotificationType[] = [
  "account_verified",
  "payment_successful",
  "payment_failed",
  "reservation_expiring",
  "reservation_expired",
  "action_approval_requested",
  "action_approved",
  "action_rejected",
  "complaint_submitted",
  "complaint_resolved",
];

const processingDeliveries = new Set<string>();

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export function buildNotificationData(row: Notification): NotificationData {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    notification_type: row.notification_type,
    channel: row.channel,
    related_entity_type: row.related_entity_type ?? null,
    related_entity_id: row.related_entity_id ?? null,
    action_url: row.action_url ?? null,
    is_read: row.is_read,
    read_at: row.read_at ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

export function buildNotificationDeliveryData(
  row: NotificationDelivery,
): NotificationDeliveryData {
  return {
    id: row.id,
    notification_id: row.notification_id,
    user_id: row.user_id,
    channel: row.channel,
    provider: row.provider,
    provider_reference: row.provider_reference ?? null,
    delivery_status: row.delivery_status,
    attempts: row.attempts,
    last_attempt_at: row.last_attempt_at ?? null,
    next_attempt_at: row.next_attempt_at ?? null,
    delivered_at: row.delivered_at ?? null,
    failure_reason: row.failure_reason ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `Provider did not respond within ${env.NOTIFICATION_PROVIDER_TIMEOUT_SECONDS} seconds.`,
        ),
      );
    }, timeoutMs);
    timer.unref();
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function providerReference(result: unknown): string | null {
  if (
    result &&
    typeof result === "object" &&
    "provider_reference" in result
  ) {
    const value = (result as { provider_reference?: unknown })
      .provider_reference;
    return value === null || value === undefined ? null : String(value);
  }
  return null;
}

export async function dispatchNotification(
  input: DispatchNotificationInput,
): Promise<NotificationData | null> {
  const preference = await getOrCreateNotificationPreferences(input.user_id);
  const type = input.notification_type;

  if (isMarketingType(type) && !preference.marketing_enabled) {
    return null;
  }
  if (!isCategoryEnabled(preference, type)) {
    return null;
  }

  const user = await User.findByPk(input.user_id, {
    attributes: ["id", "display_name", "email", "phone_number"],
  });
  if (!user) {
    return null;
  }

  const allowExternal = input.allow_external !== false;
  const essential = isAlwaysInApp(type);
  const inAppEnabled = preference.in_app_enabled || essential;
  const emailEnabled =
    allowExternal &&
    preference.email_enabled &&
    Boolean(user.email) &&
    isCategoryEnabled(preference, type);
  const smsEnabled =
    allowExternal &&
    preference.sms_enabled &&
    Boolean(user.phone_number) &&
    isCategoryEnabled(preference, type);

  if (!inAppEnabled && !emailEnabled && !smsEnabled) {
    return null;
  }

  const variables = {
    ...input.variables,
    recipient_name: input.variables.recipient_name ?? user.display_name,
    action_url: input.action_url ?? input.variables.action_url ?? null,
  };
  const rendered = renderNotificationTemplate(type, variables);

  const { notification, created } = await sequelize.transaction(
    async (transaction) => {
      const [row, wasCreated] = await Notification.findOrCreate({
        where: { dedupe_key: input.dedupe_key },
        defaults: {
          user_id: input.user_id,
          title: rendered.title,
          message: rendered.message,
          notification_type: type,
          channel: "in_app",
          related_entity_type: input.related_entity_type ?? null,
          related_entity_id: input.related_entity_id ?? null,
          action_url: input.action_url ?? null,
          dedupe_key: input.dedupe_key,
        },
        transaction,
      });

      if (!wasCreated) {
        return { notification: row, created: false };
      }

      if (inAppEnabled) {
        await NotificationDelivery.create(
          {
            notification_id: row.id,
            user_id: input.user_id,
            channel: "in_app",
            provider: "internal",
            delivery_status: "delivered",
            attempts: 1,
            last_attempt_at: new Date(),
            delivered_at: new Date(),
          },
          { transaction },
        );
      }

      if (emailEnabled) {
        await NotificationDelivery.create(
          {
            notification_id: row.id,
            user_id: input.user_id,
            channel: "email",
            provider: env.EMAIL_PROVIDER.toLowerCase(),
            delivery_status: "pending",
            attempts: 0,
            next_attempt_at: new Date(),
          },
          { transaction },
        );
      }

      if (smsEnabled) {
        await NotificationDelivery.create(
          {
            notification_id: row.id,
            user_id: input.user_id,
            channel: "sms",
            provider: env.SMS_PROVIDER.toLowerCase(),
            delivery_status: "pending",
            attempts: 0,
            next_attempt_at: new Date(),
          },
          { transaction },
        );
      }

      return { notification: row, created: true };
    },
  );

  const data = buildNotificationData(notification);

  if (created && inAppEnabled) {
    emitToUser(input.user_id, "notification:new", { notification: data });
  }

  if (created) {
    const deliveries = await NotificationDelivery.findAll({
      where: {
        notification_id: notification.id,
        channel: { [Op.in]: ["email", "sms"] },
      },
      order: [["channel", "ASC"]],
    });
    for (const delivery of deliveries) {
      await processNotificationDelivery(delivery.id);
    }
  }

  return data;
}

function retryDelaySeconds(attempts: number): number {
  const exponential = env.NOTIFICATION_RETRY_INTERVAL_SECONDS * 2 ** Math.max(0, attempts - 1);
  return Math.min(exponential, 24 * 60 * 60);
}

export async function processNotificationDelivery(
  deliveryId: string,
): Promise<NotificationDeliveryData | null> {
  if (processingDeliveries.has(deliveryId)) {
    return null;
  }
  processingDeliveries.add(deliveryId);

  try {
    const delivery = await NotificationDelivery.findByPk(deliveryId);
    if (!delivery) {
      return null;
    }

    const status = delivery.delivery_status as NotificationDeliveryStatus;
    if (status === "sent" || status === "delivered" || status === "skipped") {
      return buildNotificationDeliveryData(delivery);
    }
    if (
      status === "failed" &&
      delivery.next_attempt_at !== null &&
      new Date(delivery.next_attempt_at).getTime() > Date.now()
    ) {
      return buildNotificationDeliveryData(delivery);
    }

    const notification = await Notification.findByPk(delivery.notification_id);
    if (!notification) {
      return buildNotificationDeliveryData(delivery);
    }

    const user = await User.findByPk(delivery.user_id, {
      attributes: ["id", "email", "phone_number"],
    });
    if (!user) {
      await delivery.update({
        delivery_status: "skipped",
        failure_reason: "Recipient no longer exists.",
        next_attempt_at: null,
        last_attempt_at: new Date(),
      });
      return buildNotificationDeliveryData(delivery);
    }

    const content = buildChannelContent({
      title: notification.title,
      message: notification.message,
      action_url: notification.action_url ?? null,
    });

    let reference: string | null = null;
    try {
      if (delivery.channel === "email") {
        if (!user.email) {
          await delivery.update({
            delivery_status: "skipped",
            failure_reason: "No email address on file.",
            next_attempt_at: null,
            last_attempt_at: new Date(),
          });
          return buildNotificationDeliveryData(delivery);
        }
        const result = await withTimeout(
          getEmailProvider().sendEmail({
            to: user.email,
            subject: content.email_subject,
            text: content.email_text,
            html: content.email_html,
          }),
          env.NOTIFICATION_PROVIDER_TIMEOUT_SECONDS * 1000,
        );
        reference = providerReference(result);
      } else if (delivery.channel === "sms") {
        if (!user.phone_number) {
          await delivery.update({
            delivery_status: "skipped",
            failure_reason: "No phone number on file.",
            next_attempt_at: null,
            last_attempt_at: new Date(),
          });
          return buildNotificationDeliveryData(delivery);
        }
        const result = await withTimeout(
          getSmsProvider().sendSms({
            to: user.phone_number,
            body: content.sms_body,
          }),
          env.NOTIFICATION_PROVIDER_TIMEOUT_SECONDS * 1000,
        );
        reference = providerReference(result);
      } else {
        await delivery.update({
          delivery_status: "delivered",
          delivered_at: new Date(),
          last_attempt_at: new Date(),
          next_attempt_at: null,
          attempts: delivery.attempts + 1,
        });
        return buildNotificationDeliveryData(delivery);
      }
    } catch (error) {
      const attempts = delivery.attempts + 1;
      const message = error instanceof Error ? error.message : String(error);
      const retry = attempts < env.NOTIFICATION_MAX_RETRIES;
      await delivery.update({
        delivery_status: "failed",
        attempts,
        last_attempt_at: new Date(),
        next_attempt_at: retry
          ? new Date(Date.now() + retryDelaySeconds(attempts) * 1000)
          : null,
        failure_reason: message.slice(0, 1000),
      });
      return buildNotificationDeliveryData(delivery);
    }

    await delivery.update({
      delivery_status: "sent",
      attempts: delivery.attempts + 1,
      last_attempt_at: new Date(),
      next_attempt_at: null,
      failure_reason: null,
      provider_reference: reference,
    });
    return buildNotificationDeliveryData(delivery);
  } finally {
    processingDeliveries.delete(deliveryId);
  }
}

export async function processPendingNotificationDeliveries(
  limit = 50,
): Promise<number> {
  const now = new Date();
  const pending = await NotificationDelivery.findAll({
    where: {
      [Op.or]: [
        { delivery_status: "pending" },
        {
          delivery_status: "failed",
          next_attempt_at: { [Op.lte]: now },
        },
      ],
    } as WhereOptions,
    order: [
      ["next_attempt_at", "ASC"],
      ["created_at", "ASC"],
    ],
    limit,
  });

  let processed = 0;
  for (const delivery of pending) {
    await processNotificationDelivery(delivery.id);
    processed += 1;
  }
  return processed;
}

export async function sendReservationExpiryWarnings(): Promise<number> {
  const now = new Date();
  const warningCutoff = new Date(
    now.getTime() + env.NOTIFICATION_RESERVATION_WARNING_MINUTES * 60 * 1000,
  );
  const reservations = await InventoryReservation.findAll({
    where: {
      status: "active",
      expires_at: { [Op.gt]: now, [Op.lte]: warningCutoff },
    },
    order: [["expires_at", "ASC"]],
    limit: 50,
  });

  let sent = 0;
  for (const reservation of reservations) {
    const order = await Order.findByPk(reservation.order_id, {
      attributes: [
        "id",
        "order_number",
        "buyer_id",
        "total_amount",
        "currency",
      ],
    });
    if (!order || order.status !== "pending_payment") {
      continue;
    }

    const expiresAt = new Date(reservation.expires_at).toISOString();
    const result = await dispatchNotification({
      user_id: order.buyer_id,
      notification_type: "reservation_expiring",
      variables: {
        order_number: order.order_number,
        amount: Number(order.total_amount),
        currency: order.currency,
      },
      related_entity_type: "order",
      related_entity_id: order.id,
      action_url: `/orders/${order.id}`,
      dedupe_key: `reservation-expiring:${reservation.id}:${expiresAt}`,
    });
    if (result) {
      sent += 1;
    }
  }
  return sent;
}

export interface ListNotificationsQuery {
  page: number;
  limit: number;
  unread?: boolean;
  notification_type?: string;
}

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery,
): Promise<PaginatedNotifications & { unread_count: number }> {
  const preference = await getOrCreateNotificationPreferences(userId);
  const conditions: WhereOptions[] = [{ user_id: userId }];

  if (!preference.in_app_enabled) {
    conditions.push({ notification_type: { [Op.in]: ALWAYS_IN_APP } });
  }
  if (query.unread) {
    conditions.push({ is_read: false });
  }
  if (query.notification_type) {
    conditions.push({ notification_type: query.notification_type });
  }

  const { rows, count } = await Notification.findAndCountAll({
    where: { [Op.and]: conditions },
    order: [["created_at", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  const unreadCount = await Notification.count({
    where: { user_id: userId, is_read: false },
  });

  return {
    notifications: rows.map(buildNotificationData),
    total: count,
    page: query.page,
    limit: query.limit,
    total_pages: Math.ceil(count / query.limit),
    unread_count: unreadCount,
  };
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  return Notification.count({ where: { user_id: userId, is_read: false } });
}

export async function getNotificationById(
  userId: string,
  notificationId: string,
): Promise<NotificationData> {
  const notification = await Notification.findOne({
    where: { id: notificationId, user_id: userId },
  });
  if (!notification) {
    throw serviceError("Notification not found.", "NOT_FOUND");
  }
  return buildNotificationData(notification);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<NotificationData> {
  const notification = await Notification.findOne({
    where: { id: notificationId, user_id: userId },
  });
  if (!notification) {
    throw serviceError("Notification not found.", "NOT_FOUND");
  }
  if (!notification.is_read) {
    await notification.update({ is_read: true, read_at: new Date() });
  }
  return buildNotificationData(notification);
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  const [updated] = await Notification.update(
    { is_read: true, read_at: new Date() },
    { where: { user_id: userId, is_read: false } },
  );
  return updated;
}

export async function getNotificationPreferencesForUser(
  userId: string,
): Promise<NotificationPreferenceData> {
  return buildNotificationPreferenceData(
    await getOrCreateNotificationPreferences(userId),
  );
}

export {
  updateNotificationPreferences,
  type UpdateNotificationPreferencesInput,
};

export interface AdminListDeliveriesQuery {
  page: number;
  limit: number;
  delivery_status?: NotificationDeliveryStatus;
  channel?: NotificationChannel;
}

export async function listNotificationDeliveries(
  query: AdminListDeliveriesQuery,
): Promise<PaginatedNotificationDeliveries> {
  const where: WhereOptions = {};
  if (query.delivery_status) {
    (where as Record<string, unknown>).delivery_status =
      query.delivery_status;
  }
  if (query.channel) {
    (where as Record<string, unknown>).channel = query.channel;
  }

  const { rows, count } = await NotificationDelivery.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return {
    deliveries: rows.map(buildNotificationDeliveryData),
    total: count,
    page: query.page,
    limit: query.limit,
    total_pages: Math.ceil(count / query.limit),
  };
}

export async function retryNotificationDelivery(
  deliveryId: string,
): Promise<NotificationDeliveryData> {
  const delivery = await NotificationDelivery.findByPk(deliveryId);
  if (!delivery) {
    throw serviceError("Notification delivery not found.", "NOT_FOUND");
  }

  await delivery.update({
    delivery_status: "pending",
    attempts: 0,
    next_attempt_at: new Date(),
    last_attempt_at: null,
    delivered_at: null,
    failure_reason: null,
    provider_reference: null,
  });

  return (
    (await processNotificationDelivery(deliveryId)) ??
    buildNotificationDeliveryData(delivery)
  );
}

let workerTimer: NodeJS.Timeout | undefined;

async function runNotificationWorker(): Promise<void> {
  await processPendingNotificationDeliveries();
  await sendReservationExpiryWarnings();
}

export function startNotificationWorker(
  intervalMs = env.NOTIFICATION_WORKER_INTERVAL_SECONDS * 1000,
): void {
  if (workerTimer) return;

  const run = (): void => {
    void runNotificationWorker().catch((error: unknown) => {
      console.error("Notification worker sweep failed:", error);
    });
  };

  run();
  workerTimer = setInterval(run, intervalMs);
  workerTimer.unref();
}

export function stopNotificationWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = undefined;
  }
}
