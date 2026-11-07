/**
 * Phase 9 — Orders, inventory reservations, Paystack payments and refunds.
 *
 * Paystack provider calls are mocked; no live credentials or network access
 * are required. The suite still uses an isolated PostgreSQL test database.
 */

import { createHmac } from "node:crypto";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const paystack = vi.hoisted(() => ({
  initializeTransaction: vi.fn(),
  verifyTransaction: vi.fn(),
  createRefund: vi.fn(),
  fetchRefund: vi.fn(),
  isPaystackConfigured: vi.fn(() => true),
}));

vi.mock("../src/integrations/payments/index.js", () => paystack);

import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  InventoryReservation,
  Order,
  OrderEvent,
  Payment,
  PaymentWebhookEvent,
  ProduceListing,
  Refund,
} from "../src/database/models/index.js";
import { expireReservations } from "../src/modules/orders/reservations.service.js";

const WEBHOOK_SECRET = "whsec_phase9";

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
  paystack.isPaystackConfigured.mockReturnValue(true);
  paystack.initializeTransaction.mockImplementation(
    async (input: { reference: string }) => ({
      authorization_url: `https://checkout.paystack.com/${input.reference}`,
      access_code: `access_${input.reference}`,
      reference: input.reference,
    }),
  );
  paystack.verifyTransaction.mockImplementation(
    async (reference: string) => ({
      id: 7001,
      status: "success",
      reference,
      amount: 240_000,
      currency: "NGN",
      paid_at: new Date().toISOString(),
      channel: "card",
      gateway_response: "Successful",
      fees: 0,
    }),
  );
  paystack.fetchRefund.mockRejectedValue(new Error("not configured in test"));
}, 600_000);

interface AuthUser {
  userId: string;
  token: string;
}

interface OrderPayload {
  id: string;
  order_number: string;
  offer_id: string;
  listing_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  reservation_expires_at: string;
  item?: { title: string; line_total: number };
  reservation?: { id: string; status: string };
  payments?: Array<{ reference: string; status: string }>;
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234807${String(phoneCounter).padStart(8, "0")}`;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function registerAndLogin(phone: string): Promise<AuthUser> {
  const password = "TestPass1!";
  const reg = await request(app).post("/api/auth/register").send({
    phone_number: phone,
    password,
    password_confirm: password,
  });
  expect(reg.status, `register ${phone}`).toBe(201);
  const userId = reg.body.data.user.id as string;

  const { PhoneOtp } = await import("../src/database/models/index.js");
  const { hashOtp } = await import("../src/services/otp.service.js");
  const knownOtp = "888888";
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

  return { userId, token: login.body.data.access_token as string };
}

async function registerFarmerAndLogin(phone: string): Promise<AuthUser> {
  const auth = await registerAndLogin(phone);
  const res = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${auth.token}`)
    .send({
      farm_name: `Phase 9 Farm of ${phone}`,
      farming_experience_years: 4,
    });
  expect(res.status, `create farmer profile for ${phone}`).toBe(201);
  return auth;
}

async function getFirstProduceTypeId(): Promise<string> {
  const res = await request(app).get("/api/produce/types");
  expect(res.status).toBe(200);
  return res.body.data.types[0].id as string;
}

async function createPublishedListing(
  token: string,
  produceTypeId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const created = await request(app)
    .post("/api/listings")
    .set("Authorization", `Bearer ${token}`)
    .send({
      produce_type_id: produceTypeId,
      title: "Phase 9 Order Listing",
      quantity: 100,
      unit: "kg",
      price_per_unit: 250,
      currency: "NGN",
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      community: "Bukuru",
      expiry_date: dateOffset(30),
      ...overrides,
    });
  expect(created.status, "create listing").toBe(201);
  const listingId = created.body.data.listing.id as string;

  const published = await request(app)
    .patch(`/api/listings/${listingId}/publish`)
    .set("Authorization", `Bearer ${token}`);
  expect(published.status, "publish listing").toBe(200);

  return listingId;
}

async function createAcceptedOffer(
  buyerToken: string,
  farmerToken: string,
  listingId: string,
  quantity: number,
  unitPrice = 240,
): Promise<string> {
  const created = await request(app)
    .post("/api/offers")
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({
      listing_id: listingId,
      quantity,
      unit: "kg",
      unit_price: unitPrice,
      currency: "NGN",
      delivery_terms: "Buyer collects from the farm gate.",
      delivery_location: "Bukuru, Jos South",
      delivery_date: dateOffset(5),
      buyer_message: "Please confirm the quality and availability.",
      expires_at: dateOffset(3),
    });
  expect(created.status, "create offer").toBe(201);
  const offerId = created.body.data.offer.id as string;

  const accepted = await request(app)
    .post(`/api/offers/${offerId}/accept`)
    .set("Authorization", `Bearer ${farmerToken}`);
  expect(accepted.status, "accept offer").toBe(200);
  return offerId;
}

async function createOrder(
  token: string,
  offerId: string,
): Promise<OrderPayload> {
  const res = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ offer_id: offerId });
  expect(res.status, "create order").toBe(201);
  return res.body.data.order as OrderPayload;
}

function signedWebhookHeaders(rawBody: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha512", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `t=${timestamp},v1=whk_test_key:${signature}`;
}

function webhookRequest(rawBody: string, header = signedWebhookHeaders(rawBody)) {
  return request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .set("Paystack-Signature", header)
    .send(rawBody);
}

let farmer: AuthUser;
let buyer: AuthUser;
let outsider: AuthUser;
let produceTypeId: string;
let listingId: string;
let primaryOfferId: string;
let primaryOrder: OrderPayload;

beforeAll(async () => {
  farmer = await registerFarmerAndLogin(nextPhone());
  buyer = await registerAndLogin(nextPhone());
  outsider = await registerAndLogin(nextPhone());

  const { User } = await import("../src/database/models/index.js");
  await (await User.findByPk(farmer.userId))!.update({
    display_name: "Phase 9 Farmer",
  });
  await (await User.findByPk(buyer.userId))!.update({
    display_name: "Phase 9 Buyer",
  });

  produceTypeId = await getFirstProduceTypeId();
  listingId = await createPublishedListing(farmer.token, produceTypeId);
  primaryOfferId = await createAcceptedOffer(
    buyer.token,
    farmer.token,
    listingId,
    10,
  );
}, 240_000);

describe("Phase 9 orders", () => {
  it("requires authentication", async () => {
    const list = await request(app).get("/api/orders");
    const create = await request(app)
      .post("/api/orders")
      .send({ offer_id: primaryOfferId });
    const reservations = await request(app).get("/api/reservations");
    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
    expect(reservations.status).toBe(401);
  });

  it("creates one order from an accepted offer and reserves inventory atomically", async () => {
    primaryOrder = await createOrder(buyer.token, primaryOfferId);

    expect(primaryOrder).toMatchObject({
      offer_id: primaryOfferId,
      listing_id: listingId,
      buyer_id: buyer.userId,
      farmer_id: farmer.userId,
      quantity: 10,
      unit: "kg",
      unit_price: 240,
      total_amount: 2400,
      currency: "NGN",
      status: "pending_payment",
      payment_status: "pending",
    });
    expect(primaryOrder.order_number).toMatch(/^ORD-\d{8}-[A-F0-9]{10}$/);
    expect(primaryOrder.item).toMatchObject({
      title: "Phase 9 Order Listing",
      line_total: 2400,
    });
    expect(primaryOrder.reservation).toMatchObject({ status: "active" });

    const listing = await ProduceListing.findByPk(listingId);
    expect(Number(listing!.available_quantity)).toBe(90);
    expect(Number(listing!.reserved_quantity)).toBe(10);
    expect(Number(listing!.sold_quantity)).toBe(0);

    const history = await request(app)
      .get(`/api/orders/${primaryOrder.id}/history`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.history.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "created", new_status: "pending_payment" }),
      ]),
    );
  });

  it("prevents duplicate orders, outsider access, and non-buyer creation", async () => {
    const duplicate = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ offer_id: primaryOfferId });
    expect(duplicate.status).toBe(409);

    const byFarmer = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ offer_id: primaryOfferId });
    expect(byFarmer.status).toBe(403);

    const outsiderView = await request(app)
      .get(`/api/orders/${primaryOrder.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    const outsiderHistory = await request(app)
      .get(`/api/orders/${primaryOrder.id}/history`)
      .set("Authorization", `Bearer ${outsider.token}`);
    const outsiderReservation = await request(app)
      .get(`/api/orders/${primaryOrder.id}/reservation`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderView.status).toBe(404);
    expect(outsiderHistory.status).toBe(404);
    expect(outsiderReservation.status).toBe(404);
  });

  it("lists orders and reservations for each participant with filters", async () => {
    const buyerList = await request(app)
      .get("/api/orders?role=buyer&status=pending_payment")
      .set("Authorization", `Bearer ${buyer.token}`);
    const farmerList = await request(app)
      .get("/api/orders?role=farmer")
      .set("Authorization", `Bearer ${farmer.token}`);
    const outsiderList = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${outsider.token}`);
    const reservation = await request(app)
      .get(`/api/orders/${primaryOrder.id}/reservation`)
      .set("Authorization", `Bearer ${buyer.token}`);
    const reservations = await request(app)
      .get(`/api/reservations?order_id=${primaryOrder.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(buyerList.status).toBe(200);
    expect(farmerList.status).toBe(200);
    expect(
      buyerList.body.data.orders.map((order: OrderPayload) => order.id),
    ).toContain(primaryOrder.id);
    expect(
      farmerList.body.data.orders.map((order: OrderPayload) => order.id),
    ).toContain(primaryOrder.id);
    expect(outsiderList.body.data.orders).toHaveLength(0);
    expect(reservation.status).toBe(200);
    expect(reservation.body.data.reservation.status).toBe("active");
    expect(reservations.status).toBe(200);
    expect(reservations.body.data.reservations).toHaveLength(1);
  });

  it("cancels an unpaid order and restores reserved inventory", async () => {
    const offerId = await createAcceptedOffer(
      buyer.token,
      farmer.token,
      listingId,
      5,
    );
    const order = await createOrder(buyer.token, offerId);

    const listingBefore = await ProduceListing.findByPk(listingId);
    expect(Number(listingBefore!.available_quantity)).toBe(85);

    const cancelled = await request(app)
      .post(`/api/orders/${order.id}/cancel`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ reason: "Changed delivery plans." });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order.status).toBe("cancelled");
    expect(cancelled.body.data.order.cancelled_at).toBeTruthy();

    const reservation = await InventoryReservation.findOne({
      where: { order_id: order.id },
    });
    expect(reservation!.status).toBe("released");
    expect(reservation!.release_reason).toBe("order_cancelled");

    const listingAfter = await ProduceListing.findByPk(listingId);
    expect(Number(listingAfter!.available_quantity)).toBe(90);
    expect(Number(listingAfter!.reserved_quantity)).toBe(10);
  });

  it("prevents overselling when two accepted offers race for the same stock", async () => {
    const raceListingId = await createPublishedListing(
      farmer.token,
      produceTypeId,
      { title: "Phase 9 Race Listing", quantity: 100 },
    );
    const offerA = await createAcceptedOffer(
      buyer.token,
      farmer.token,
      raceListingId,
      60,
    );
    const offerB = await createAcceptedOffer(
      buyer.token,
      farmer.token,
      raceListingId,
      60,
    );

    const [first, second] = await Promise.all([
      request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ offer_id: offerA }),
      request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ offer_id: offerB }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 422]);
    const listing = await ProduceListing.findByPk(raceListingId);
    expect(Number(listing!.available_quantity)).toBe(40);
    expect(Number(listing!.reserved_quantity)).toBe(60);
  });
});

describe("Phase 9 Paystack payments", () => {
  it("initializes and reuses a pending hosted checkout", async () => {
    const outsiderInit = await request(app)
      .post("/api/payments/paystack/initialize")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ order_id: primaryOrder.id });
    const farmerInit = await request(app)
      .post("/api/payments/paystack/initialize")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ order_id: primaryOrder.id });
    expect(outsiderInit.status).toBe(404);
    expect(farmerInit.status).toBe(403);

    const initialized = await request(app)
      .post("/api/payments/paystack/initialize")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ order_id: primaryOrder.id });
    expect(initialized.status).toBe(201);
    expect(initialized.body.data.authorization_url).toContain(
      "checkout.paystack.com",
    );
    expect(initialized.body.data.payment).toMatchObject({
      status: "pending",
      amount_minor: 240_000,
      amount: 2400,
      currency: "NGN",
    });
    expect(paystack.initializeTransaction).toHaveBeenCalledTimes(1);

    const reused = await request(app)
      .post("/api/payments/paystack/initialize")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ order_id: primaryOrder.id });
    expect(reused.status).toBe(201);
    expect(reused.body.data.payment.reference).toBe(
      initialized.body.data.payment.reference,
    );
    expect(paystack.initializeTransaction).toHaveBeenCalledTimes(1);

    const payments = await request(app)
      .get(`/api/orders/${primaryOrder.id}/payments`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(payments.status).toBe(200);
    expect(payments.body.data.payments).toHaveLength(1);
  });

  it("verifies a successful payment, consumes the reservation, and guards status transitions", async () => {
    const payment = await Payment.findOne({
      where: { order_id: primaryOrder.id },
    });
    expect(payment).not.toBeNull();

    paystack.verifyTransaction.mockResolvedValueOnce({
      id: 7001,
      status: "success",
      reference: payment!.reference,
      amount: 240_000,
      currency: "NGN",
      paid_at: new Date().toISOString(),
      channel: "card",
      gateway_response: "Successful",
      fees: 0,
    });

    const verified = await request(app)
      .get(`/api/payments/paystack/verify/${payment!.reference}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(verified.status).toBe(200);
    expect(verified.body.data.payment.status).toBe("success");
    expect(verified.body.data.order).toMatchObject({
      status: "paid",
      payment_status: "paid",
    });

    const listing = await ProduceListing.findByPk(listingId);
    expect(Number(listing!.reserved_quantity)).toBe(0);
    expect(Number(listing!.sold_quantity)).toBe(10);

    const buyerTriesProcessing = await request(app)
      .patch(`/api/orders/${primaryOrder.id}/status`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ status: "processing" });
    expect(buyerTriesProcessing.status).toBe(403);

    for (const status of [
      "processing",
      "ready_for_delivery",
      "in_transit",
      "delivered",
    ]) {
      const updated = await request(app)
        .patch(`/api/orders/${primaryOrder.id}/status`)
        .set("Authorization", `Bearer ${farmer.token}`)
        .send({ status });
      expect(updated.status, `farmer sets ${status}`).toBe(200);
    }

    const completed = await request(app)
      .patch(`/api/orders/${primaryOrder.id}/status`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ status: "completed" });
    expect(completed.status).toBe(200);
    expect(completed.body.data.order.status).toBe("completed");
    expect(completed.body.data.order.completed_at).toBeTruthy();

    const paidOrderCancel = await request(app)
      .post(`/api/orders/${primaryOrder.id}/cancel`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ reason: "Should require a refund." });
    expect(paidOrderCancel.status).toBe(422);
  });

  it("rejects invalid webhook signatures and accepts a signed successful charge", async () => {
    const listing = await ProduceListing.findByPk(listingId);
    const beforeAvailable = Number(listing!.available_quantity);
    const offerId = await createAcceptedOffer(
      buyer.token,
      farmer.token,
      listingId,
      10,
    );
    const order = await createOrder(buyer.token, offerId);

    const init = await request(app)
      .post("/api/payments/paystack/initialize")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ order_id: order.id });
    expect(init.status).toBe(201);
    const reference = init.body.data.payment.reference as string;

    const rawBody = JSON.stringify({
      event: "charge.success",
      data: {
        id: 9001,
        status: "success",
        reference,
        amount: 240_000,
        currency: "NGN",
        channel: "card",
        gateway_response: "Successful",
        paid_at: new Date().toISOString(),
      },
    });

    const invalid = await webhookRequest(rawBody, "t=1,v1=whk_bad:deadbeef");
    expect(invalid.status).toBe(401);

    const accepted = await webhookRequest(rawBody);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data).toMatchObject({
      duplicate: false,
      processed: true,
    });

    const duplicate = await webhookRequest(rawBody);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data).toMatchObject({
      duplicate: true,
      processed: true,
    });

    const paidOrder = await Order.findByPk(order.id);
    expect(paidOrder).toMatchObject({
      status: "paid",
      payment_status: "paid",
    });
    const reservation = await InventoryReservation.findOne({
      where: { order_id: order.id },
    });
    expect(reservation!.status).toBe("consumed");

    const afterListing = await ProduceListing.findByPk(listingId);
    expect(Number(afterListing!.available_quantity)).toBe(
      beforeAvailable - 10,
    );
    expect(Number(afterListing!.sold_quantity)).toBe(20);
    expect(Number(afterListing!.reserved_quantity)).toBe(0);

    const eventCount = await PaymentWebhookEvent.count({
      where: { reference },
    });
    expect(eventCount).toBe(1);
  });

  it("processes a full refund and restores sold inventory", async () => {
    const paidOrder = await Order.findOne({
      where: { buyer_id: buyer.userId, status: "paid" },
      order: [["created_at", "DESC"]],
    });
    expect(paidOrder).not.toBeNull();
    const payment = await Payment.findOne({
      where: { order_id: paidOrder!.id, status: "success" },
    });
    expect(payment).not.toBeNull();

    const listingBefore = await ProduceListing.findByPk(listingId);
    const soldBefore = Number(listingBefore!.sold_quantity);
    const availableBefore = Number(listingBefore!.available_quantity);

    paystack.createRefund.mockResolvedValueOnce({
      id: 5001,
      status: "processed",
      amount: 240_000,
      currency: "NGN",
      transaction: payment!.reference,
      merchant_note: "Refunded during Phase 9 test",
      customer_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const refunded = await request(app)
      .post(`/api/payments/paystack/${payment!.reference}/refund`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ merchant_note: "Refunded during Phase 9 test" });
    expect(refunded.status).toBe(201);
    expect(refunded.body.data.refund).toMatchObject({
      status: "processed",
      amount_minor: 240_000,
      amount: 2400,
      currency: "NGN",
      provider_refund_id: "5001",
    });

    const orderAfter = await Order.findByPk(paidOrder!.id);
    expect(orderAfter).toMatchObject({
      status: "refunded",
      payment_status: "refunded",
    });
    expect(orderAfter!.refunded_at).toBeTruthy();

    const paymentAfter = await Payment.findByPk(payment!.id);
    expect(paymentAfter!.status).toBe("refunded");

    const listingAfter = await ProduceListing.findByPk(listingId);
    expect(Number(listingAfter!.sold_quantity)).toBe(soldBefore - 10);
    expect(Number(listingAfter!.available_quantity)).toBe(
      availableBefore + 10,
    );

    const refundList = await request(app)
      .get(`/api/payments/paystack/${payment!.reference}/refund`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(refundList.status).toBe(200);
    expect(refundList.body.data.refunds).toHaveLength(1);

    const refundRecord = await Refund.findOne({ where: { id: refunded.body.data.refund.id } });
    expect(refundRecord!.status).toBe("processed");
    expect(refundRecord!.processed_at).toBeTruthy();
  });

  it("expires unpaid reservations, cancels the order, and releases stock", async () => {
    const listing = await ProduceListing.findByPk(listingId);
    const availableBefore = Number(listing!.available_quantity);
    const offerId = await createAcceptedOffer(
      buyer.token,
      farmer.token,
      listingId,
      5,
    );
    const order = await createOrder(buyer.token, offerId);

    await Order.update(
      { reservation_expires_at: new Date(Date.now() - 60_000) },
      { where: { id: order.id } },
    );
    await InventoryReservation.update(
      { expires_at: new Date(Date.now() - 60_000) },
      { where: { order_id: order.id } },
    );

    const processed = await expireReservations();
    expect(processed).toBeGreaterThanOrEqual(1);

    const orderAfter = await Order.findByPk(order.id);
    expect(orderAfter).toMatchObject({
      status: "cancelled",
      payment_status: "pending",
    });
    expect(orderAfter!.cancelled_at).toBeTruthy();

    const reservation = await InventoryReservation.findOne({
      where: { order_id: order.id },
    });
    expect(reservation!.status).toBe("expired");
    expect(reservation!.release_reason).toBe("reservation_expired");

    const listingAfter = await ProduceListing.findByPk(listingId);
    expect(Number(listingAfter!.available_quantity)).toBe(availableBefore);

    const expiryEvent = await OrderEvent.findOne({
      where: { order_id: order.id, action: "reservation_expired" },
    });
    expect(expiryEvent).not.toBeNull();
  });
});
