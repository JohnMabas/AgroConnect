/**
 * Phase 11 — Notifications.
 *
 * Exercises event-driven in-app notifications, email/SMS channel dispatch,
 * preferences, idempotency, inbox APIs, Socket.IO delivery, retries and admin
 * controls. Email and SMS providers are mocked; no real messages are sent.
 */

import { randomUUID } from "node:crypto";
import { Op } from "sequelize";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  Notification,
  NotificationDelivery,
  PhoneOtp,
  Role,
  UserRole,
} from "../src/database/models/index.js";
import type { DeliveryData } from "../src/modules/deliveries/deliveries.types.js";
import { publishDeliveryUpdated } from "../src/modules/deliveries/deliveries.events.js";
import { publishMessageCreated } from "../src/modules/messaging/messaging.events.js";
import {
  publishOrderUpdated,
} from "../src/modules/orders/orders.events.js";
import { getOrderDataById } from "../src/modules/orders/orders.service.js";
import {
  dispatchNotification,
  processNotificationDelivery,
} from "../src/modules/notifications/notifications.service.js";
import { setEmailProvider } from "../src/integrations/email/index.js";
import { setSmsProvider } from "../src/integrations/sms/index.js";
import {
  clearSocketServer,
  setSocketServer,
} from "../src/realtime/registry.js";

const emailSend = vi.fn(async () => ({
  provider_reference: "email-ref-1",
}));
const smsSend = vi.fn(async () => ({
  provider_reference: "sms-ref-1",
}));

beforeAll(async () => {
  setEmailProvider({ sendEmail: emailSend });
  setSmsProvider({ sendSms: smsSend });

  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
}, 600_000);

afterAll(() => {
  clearSocketServer();
});

beforeEach(() => {
  emailSend.mockClear();
  smsSend.mockClear();
});

interface AuthUser {
  userId: string;
  token: string;
  phone: string;
  email: string;
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234811${String(phoneCounter).padStart(8, "0")}`;
}

let emailCounter = 0;
function nextEmail(): string {
  emailCounter += 1;
  return `phase11-user-${emailCounter}@example.com`;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function registerAndLogin(
  phone = nextPhone(),
  email = nextEmail(),
): Promise<AuthUser> {
  const password = "TestPass1!";
  const reg = await request(app).post("/api/auth/register").send({
    phone_number: phone,
    email,
    password,
    password_confirm: password,
  });
  expect(reg.status, `register ${phone}`).toBe(201);
  const userId = reg.body.data.user.id as string;

  const knownOtp = "888888";
  const { hashOtp } = await import("../src/services/otp.service.js");
  await PhoneOtp.update(
    { otp_hash: hashOtp(knownOtp) },
    { where: { user_id: userId, used: false } },
  );

  const verify = await request(app)
    .post("/api/auth/verify-phone")
    .send({ user_id: userId, otp: knownOtp });
  expect(verify.status, `verify-phone ${phone}`).toBe(200);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ identifier: phone, password });
  expect(login.status, `login ${phone}`).toBe(200);

  return {
    userId,
    token: login.body.data.access_token as string,
    phone,
    email,
  };
}

async function grantRole(userId: string, roleName: string): Promise<void> {
  const role = await Role.findOne({ where: { name: roleName } });
  expect(role, `role ${roleName}`).not.toBeNull();
  await UserRole.findOrCreate({
    where: { user_id: userId, role_id: role!.id },
    defaults: { user_id: userId, role_id: role!.id },
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNotification(
  userId: string,
  notificationType: string,
  relatedEntityId?: string,
): Promise<Notification> {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const where: Record<string, unknown> = {
      user_id: userId,
      notification_type: notificationType,
    };
    if (relatedEntityId) {
      where.related_entity_id = relatedEntityId;
    }
    const notification = await Notification.findOne({
      where,
      order: [["created_at", "DESC"]],
    });
    if (notification) {
      return notification;
    }
    await sleep(25);
  }
  throw new Error(
    `Timed out waiting for ${notificationType} notification for ${userId}.`,
  );
}

async function waitForDelivery(
  notificationId: string,
  channel: "email" | "sms",
): Promise<NotificationDelivery> {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const delivery = await NotificationDelivery.findOne({
      where: { notification_id: notificationId, channel },
    });
    if (delivery && delivery.delivery_status !== "pending") {
      return delivery;
    }
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${channel} delivery.`);
}

let farmer: AuthUser;
let buyer: AuthUser;
let outsider: AuthUser;
let admin: AuthUser;
let listingId: string;
let offerId: string;
let orderId: string;

beforeAll(async () => {
  farmer = await registerAndLogin();
  buyer = await registerAndLogin();
  outsider = await registerAndLogin();
  admin = await registerAndLogin();
  await grantRole(admin.userId, "admin");

  const profile = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${farmer.token}`)
    .send({
      farm_name: `Phase 11 Farm ${farmer.phone}`,
      farming_experience_years: 5,
    });
  expect(profile.status, "create farmer profile").toBe(201);

  const types = await request(app).get("/api/produce/types");
  expect(types.status).toBe(200);
  const produceTypeId = types.body.data.types[0].id as string;

  const created = await request(app)
    .post("/api/listings")
    .set("Authorization", `Bearer ${farmer.token}`)
    .send({
      produce_type_id: produceTypeId,
      title: "Phase 11 Notification Maize",
      quantity: 200,
      unit: "kg",
      price_per_unit: 300,
      currency: "NGN",
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      community: "Bukuru",
      expiry_date: dateOffset(30),
    });
  expect(created.status, "create listing").toBe(201);
  listingId = created.body.data.listing.id as string;

  const published = await request(app)
    .patch(`/api/listings/${listingId}/publish`)
    .set("Authorization", `Bearer ${farmer.token}`);
  expect(published.status, "publish listing").toBe(200);
}, 600_000);

describe("Phase 11 notifications", () => {
  it("creates in-app and email notifications for a new offer", async () => {
    const response = await request(app)
      .post("/api/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        listing_id: listingId,
        quantity: 10,
        unit: "kg",
        unit_price: 280,
        currency: "NGN",
        delivery_terms: "Delivered to the buyer's market address.",
        delivery_location: "Bukuru, Jos South",
        delivery_date: dateOffset(5),
        buyer_message: "Please confirm availability.",
        expires_at: dateOffset(3),
      });
    expect(response.status, "create offer").toBe(201);
    offerId = response.body.data.offer.id as string;

    const notification = await waitForNotification(
      farmer.userId,
      "new_offer",
      offerId,
    );
    expect(notification.title).toContain("offer");
    expect(notification.channel).toBe("in_app");
    expect(notification.related_entity_type).toBe("offer");
    expect(notification.action_url).toBe(`/offers/${offerId}`);

    const inApp = await NotificationDelivery.findOne({
      where: { notification_id: notification.id, channel: "in_app" },
    });
    expect(inApp).not.toBeNull();
    expect(inApp!.delivery_status).toBe("delivered");

    const email = await waitForDelivery(notification.id, "email");
    expect(email.provider).toBe("dev");
    expect(email.delivery_status).toBe("sent");
    expect(email.provider_reference).toBe("email-ref-1");
    expect(emailSend).toHaveBeenCalled();

    const actorNotification = await Notification.findOne({
      where: {
        user_id: buyer.userId,
        notification_type: "new_offer",
        related_entity_id: offerId,
      },
    });
    expect(actorNotification).toBeNull();
  });

  it("deduplicates repeated notification dispatches", async () => {
    const dedupeKey = `phase11-dedupe:${randomUUID()}`;
    const input = {
      user_id: buyer.userId,
      notification_type: "system_announcement" as const,
      variables: {
        title: "Maintenance window",
        message: "The platform will be read-only for a short window.",
      },
      related_entity_type: "system",
      related_entity_id: "maintenance",
      action_url: "/notifications",
      dedupe_key: dedupeKey,
      allow_external: false,
    };

    const first = await dispatchNotification(input);
    const second = await dispatchNotification(input);
    expect(first).not.toBeNull();
    expect(second!.id).toBe(first!.id);

    const count = await Notification.count({ where: { dedupe_key: dedupeKey } });
    expect(count).toBe(1);
    const deliveries = await NotificationDelivery.count({
      where: { notification_id: first!.id },
    });
    expect(deliveries).toBe(1);
  });

  it("honours category preferences and keeps essential notifications in-app", async () => {
    const disabled = await request(app)
      .patch("/api/notifications/preferences")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({
        in_app_enabled: false,
        offers_enabled: false,
        marketing_enabled: false,
      });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.preferences.in_app_enabled).toBe(false);
    expect(disabled.body.data.preferences.offers_enabled).toBe(false);

    const offerNotification = await dispatchNotification({
      user_id: outsider.userId,
      notification_type: "new_offer",
      variables: { offer_number: "OFR-DISABLED" },
      dedupe_key: `phase11-disabled-offer:${randomUUID()}`,
      allow_external: false,
    });
    expect(offerNotification).toBeNull();

    const essential = await dispatchNotification({
      user_id: outsider.userId,
      notification_type: "account_verified",
      variables: { verification_method: "phone" },
      dedupe_key: `phase11-essential:${randomUUID()}`,
      allow_external: false,
    });
    expect(essential).not.toBeNull();
    const essentialDelivery = await NotificationDelivery.findOne({
      where: { notification_id: essential!.id, channel: "in_app" },
    });
    expect(essentialDelivery?.delivery_status).toBe("delivered");

    const marketingBefore = await dispatchNotification({
      user_id: buyer.userId,
      notification_type: "marketing",
      variables: { title: "Weekly market insight", message: "Maize prices rose." },
      dedupe_key: `phase11-marketing-before:${randomUUID()}`,
      allow_external: false,
    });
    expect(marketingBefore).toBeNull();

    const enableMarketing = await request(app)
      .patch("/api/notifications/preferences")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ marketing_enabled: true });
    expect(enableMarketing.status).toBe(200);

    const marketingAfter = await dispatchNotification({
      user_id: buyer.userId,
      notification_type: "marketing",
      variables: { title: "Weekly market insight", message: "Maize prices rose." },
      dedupe_key: `phase11-marketing-after:${randomUUID()}`,
      allow_external: false,
    });
    expect(marketingAfter).not.toBeNull();

    const emptyPatch = await request(app)
      .patch("/api/notifications/preferences")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({});
    expect(emptyPatch.status).toBe(422);
  });

  it("lists and marks notifications read while preventing cross-user access", async () => {
    const notification = await waitForNotification(
      farmer.userId,
      "new_offer",
      offerId,
    );

    const list = await request(app)
      .get("/api/notifications?unread=true&limit=10")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.notifications.length).toBeGreaterThan(0);
    expect(list.body.data.unread_count).toBeGreaterThan(0);

    const unread = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(unread.status).toBe(200);
    expect(unread.body.data.unread_count).toBeGreaterThan(0);

    const read = await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(read.status).toBe(200);
    expect(read.body.data.notification.is_read).toBe(true);
    expect(read.body.data.notification.read_at).toBeTruthy();

    const outsiderRead = await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderRead.status).toBe(404);

    const outsiderGet = await request(app)
      .get(`/api/notifications/${notification.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderGet.status).toBe(404);

    const invalid = await request(app)
      .get("/api/notifications/not-a-uuid")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(invalid.status).toBe(422);

    const readAll = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(readAll.status).toBe(200);
    expect(readAll.body.data.updated).toBeGreaterThan(0);

    const after = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(after.body.data.unread_count).toBe(0);
  });

  it("notifies the buyer when an offer is accepted and creates the order notification", async () => {
    const accepted = await request(app)
      .post(`/api/offers/${offerId}/accept`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(accepted.status).toBe(200);

    const acceptedNotification = await waitForNotification(
      buyer.userId,
      "offer_accepted",
      offerId,
    );
    expect(acceptedNotification.message).toContain("accepted offer");

    const createdOrder = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ offer_id: offerId });
    expect(createdOrder.status).toBe(201);
    orderId = createdOrder.body.data.order.id as string;

    const orderNotification = await waitForNotification(
      farmer.userId,
      "order_created",
      orderId,
    );
    expect(orderNotification.related_entity_type).toBe("order");
  });

  it("maps verified payment and delivery events to notifications", async () => {
    const order = await getOrderDataById(orderId);
    publishOrderUpdated(order, "payment_confirmed", null);

    const buyerPayment = await waitForNotification(
      buyer.userId,
      "payment_successful",
      orderId,
    );
    const farmerPayment = await waitForNotification(
      farmer.userId,
      "payment_successful",
      orderId,
    );
    expect(buyerPayment.message).toContain("confirmed");
    expect(farmerPayment.user_id).toBe(farmer.userId);

    const deliveryId = randomUUID();
    const delivery = {
      id: deliveryId,
      delivery_reference: "DEL-PHASE11-001",
      order_id: orderId,
      farmer_id: farmer.userId,
      buyer_id: buyer.userId,
      transporter_id: null,
      pickup_location: "Bukuru",
      delivery_location: "Jos South",
      produce_description: "Maize",
      quantity: 10,
      unit: "kg",
      expected_pickup_date: dateOffset(1),
      expected_delivery_date: dateOffset(2),
      delivery_fee_minor: 50_000,
      delivery_fee: 500,
      currency: "NGN",
      additional_instructions: null,
      status: "in_transit",
      created_by_user_id: buyer.userId,
      assigned_at: null,
      accepted_at: null,
      picked_up_at: null,
      delivered_at: null,
      completed_at: null,
      cancelled_at: null,
      failed_at: null,
      cancellation_reason: null,
      failure_reason: null,
      order: {
        id: orderId,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        quantity: order.quantity,
        unit: order.unit,
        total_amount: order.total_amount,
        currency: order.currency,
        delivery_location: order.delivery_location,
        delivery_date: order.delivery_date,
      },
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies DeliveryData;

    publishDeliveryUpdated(delivery, "in_transit", farmer.userId);
    const deliveryNotification = await waitForNotification(
      buyer.userId,
      "delivery_in_transit",
      deliveryId,
    );
    expect(deliveryNotification.message).toContain("in transit");
  });

  it("creates messaging notifications without external channels", async () => {
    const messageId = randomUUID();
    const conversationId = randomUUID();

    publishMessageCreated({
      conversation_id: conversationId,
      message: {
        id: messageId,
        conversation_id: conversationId,
        sender_user_id: buyer.userId,
        content: "Is the maize still available?",
        message_type: "text",
        status: "sent",
        delivered_at: null,
        read_at: null,
        sender: { id: buyer.userId, display_name: "Phase 11 Buyer" },
        created_at: new Date(),
        updated_at: new Date(),
      },
      participant_user_ids: [buyer.userId, farmer.userId],
    });

    const notification = await waitForNotification(
      farmer.userId,
      "new_message",
      conversationId,
    );
    expect(notification.message).toContain("maize");

    const external = await NotificationDelivery.count({
      where: {
        notification_id: notification.id,
        channel: { [Op.in]: ["email", "sms"] },
      },
    });
    expect(external).toBe(0);
  });

  it("uses SMS when the user enables it", async () => {
    const update = await request(app)
      .patch("/api/notifications/preferences")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ sms_enabled: true });
    expect(update.status).toBe(200);

    const notification = await dispatchNotification({
      user_id: farmer.userId,
      notification_type: "delivery_accepted",
      variables: {
        actor_name: "Transporter One",
        delivery_reference: "DEL-PHASE11-002",
      },
      dedupe_key: `phase11-sms:${randomUUID()}`,
    });
    expect(notification).not.toBeNull();

    const sms = await waitForDelivery(notification!.id, "sms");
    expect(sms.delivery_status).toBe("sent");
    expect(sms.provider).toBe("dev");
    expect(sms.provider_reference).toBe("sms-ref-1");
    expect(smsSend).toHaveBeenCalled();
  });

  it("exposes failed deliveries to admins and retries them", async () => {
    emailSend.mockRejectedValueOnce(new Error("smtp unavailable"));

    const notification = await dispatchNotification({
      user_id: farmer.userId,
      notification_type: "system_announcement",
      variables: {
        title: "Retry test",
        message: "This email will fail once.",
      },
      dedupe_key: `phase11-retry:${randomUUID()}`,
    });
    expect(notification).not.toBeNull();

    const email = await waitForDelivery(notification!.id, "email");
    expect(email.delivery_status).toBe("failed");
    expect(email.attempts).toBe(1);
    expect(email.failure_reason).toContain("smtp unavailable");
    expect(email.next_attempt_at).not.toBeNull();

    const nonAdmin = await request(app)
      .get("/api/admin/notifications/deliveries")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(nonAdmin.status).toBe(403);

    const adminList = await request(app)
      .get("/api/admin/notifications/deliveries?delivery_status=failed&limit=50")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminList.status).toBe(200);
    expect(
      adminList.body.data.deliveries.some(
        (row: { id: string }) => row.id === email.id,
      ),
    ).toBe(true);

    const retry = await request(app)
      .post(`/api/admin/notifications/deliveries/${email.id}/retry`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(retry.status).toBe(200);
    expect(retry.body.data.delivery.delivery_status).toBe("sent");
    expect(retry.body.data.delivery.provider_reference).toBe("email-ref-1");
    expect(retry.body.data.delivery.attempts).toBe(1);

    const missing = await request(app)
      .post(`/api/admin/notifications/deliveries/${randomUUID()}/retry`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(missing.status).toBe(404);

    const invalid = await request(app)
      .post("/api/admin/notifications/deliveries/not-a-uuid/retry")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(invalid.status).toBe(422);
  });

  it("does not process failed deliveries before their next retry time", async () => {
    const notification = await dispatchNotification({
      user_id: farmer.userId,
      notification_type: "system_announcement",
      variables: { title: "Future retry", message: "Not due yet." },
      dedupe_key: `phase11-future-retry:${randomUUID()}`,
    });
    expect(notification).not.toBeNull();

    const email = await waitForDelivery(notification!.id, "email");
    await email.update({
      delivery_status: "failed",
      attempts: 1,
      next_attempt_at: new Date(Date.now() + 60 * 60 * 1000),
      failure_reason: "temporary failure",
    });
    emailSend.mockClear();

    await processNotificationDelivery(email.id);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("emits notification:new on the recipient's Socket.IO room", async () => {
    const sends: Array<{ room: string; event: string; payload: unknown }> = [];
    setSocketServer({
      to(room: string) {
        return {
          emit(event: string, payload: unknown) {
            sends.push({ room, event, payload });
          },
        };
      },
    } as never);

    const notification = await dispatchNotification({
      user_id: buyer.userId,
      notification_type: "system_announcement",
      variables: { title: "Socket test", message: "Realtime delivery." },
      dedupe_key: `phase11-socket:${randomUUID()}`,
      allow_external: false,
    });
    expect(notification).not.toBeNull();
    expect(
      sends.some(
        (send) =>
          send.room === `user:${buyer.userId}` &&
          send.event === "notification:new",
      ),
    ).toBe(true);

    clearSocketServer();
  });
});
