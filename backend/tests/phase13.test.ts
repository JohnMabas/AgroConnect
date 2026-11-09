/**
 * Phase 13 — Market intelligence, price aggregation, observations, analytics
 * and deterministic insights.
 */

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  BuyerRequest,
  CooperativeAgentAssignment,
  CooperativeProfile,
  MarketInsight,
  MarketObservation,
  MarketPrice,
  Notification,
  Order,
  PhoneOtp,
  ProduceType,
  Role,
  UserRole,
} from "../src/database/models/index.js";

interface AuthUser {
  userId: string;
  token: string;
  phone: string;
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234813${String(phoneCounter).padStart(8, "0")}`;
}

function nextEmail(): string {
  return `phase13-user-${phoneCounter}@example.com`;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function registerAndLogin(): Promise<AuthUser> {
  const phone = nextPhone();
  const email = nextEmail();
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

async function createAcceptedOffer(
  buyerToken: string,
  farmerToken: string,
  listingId: string,
  quantity: number,
): Promise<string> {
  const created = await request(app)
    .post("/api/offers")
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({
      listing_id: listingId,
      quantity,
      unit: "kg",
      unit_price: 280,
      currency: "NGN",
      delivery_terms: "Delivered to the buyer's market address.",
      delivery_location: "Bukuru, Jos South",
      delivery_date: dateOffset(5),
      buyer_message: "Please confirm availability.",
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

async function createPublishedListing(
  token: string,
  produceTypeId: string,
): Promise<string> {
  const created = await request(app)
    .post("/api/listings")
    .set("Authorization", `Bearer ${token}`)
    .send({
      produce_type_id: produceTypeId,
      title: "Phase 13 Market Maize",
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
  const listingId = created.body.data.listing.id as string;

  const published = await request(app)
    .patch(`/api/listings/${listingId}/publish`)
    .set("Authorization", `Bearer ${token}`);
  expect(published.status, "publish listing").toBe(200);
  return listingId;
}

let farmer: AuthUser;
let buyer: AuthUser;
let admin: AuthUser;
let agent: AuthUser;
let produceTypeId: string;
let produceCategoryId: string;
let listingId: string;
let completedOrderId: string;
let approvedObservationId: string;
let rejectedObservationId: string;

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();

  farmer = await registerAndLogin();
  buyer = await registerAndLogin();
  admin = await registerAndLogin();
  agent = await registerAndLogin();
  await grantRole(admin.userId, "admin");
  await grantRole(agent.userId, "cooperative_agent");

  const profile = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${farmer.token}`)
    .send({
      farm_name: `Phase 13 Farm ${farmer.phone}`,
      farming_experience_years: 5,
    });
  expect(profile.status, "create farmer profile").toBe(201);

  const type = await ProduceType.findOne({ order: [["name", "ASC"]] });
  expect(type).not.toBeNull();
  produceTypeId = type!.id;
  produceCategoryId = type!.category_id;

  listingId = await createPublishedListing(farmer.token, produceTypeId);

  const offerId = await createAcceptedOffer(
    buyer.token,
    farmer.token,
    listingId,
    10,
  );
  const order = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${buyer.token}`)
    .send({ offer_id: offerId });
  expect(order.status, "create order").toBe(201);
  completedOrderId = order.body.data.order.id as string;
  await Order.update(
    {
      status: "completed",
      payment_status: "paid",
      paid_at: new Date(),
      completed_at: new Date(),
    },
    { where: { id: completedOrderId } },
  );

  await BuyerRequest.create({
    buyer_user_id: buyer.userId,
    produce_type_id: produceTypeId,
    produce_category_id: produceCategoryId,
    requested_quantity: 500,
    unit: "kg",
    country: "Nigeria",
    state_or_region: "Plateau",
    local_government_area: "Jos North",
    target_price_per_unit: 320,
    currency: "NGN",
    expiry_date: dateOffset(30),
    status: "open",
  });

  const cooperative = await CooperativeProfile.create({
    registered_by_user_id: farmer.userId,
    cooperative_name: `Phase 13 Cooperative ${farmer.phone}`,
    country: "Nigeria",
    state_or_region: "Plateau",
    verification_status: "approved",
  });
  await CooperativeAgentAssignment.create({
    cooperative_id: cooperative.id,
    agent_user_id: agent.userId,
    assigned_by_user_id: admin.userId,
    status: "active",
    assigned_at: new Date(),
  });
}, 600_000);

describe("Phase 13 market prices", () => {
  it("lists normalized prices, summaries, trends and comparisons", async () => {
    const prices = await request(app)
      .get("/api/market/prices")
      .query({
        produce_type_id: produceTypeId,
        state_or_region: "Plateau",
        unit: "kg",
      })
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(prices.status, "list prices").toBe(200);
    expect(prices.body.data.groups.length).toBeGreaterThan(0);
    expect(prices.body.data.groups[0].observation_count).toBeGreaterThanOrEqual(
      2,
    );
    const sourceTypes = prices.body.data.groups[0].source_breakdown.map(
      (item: { source_type: string }) => item.source_type,
    );
    expect(sourceTypes).toContain("marketplace_listing");
    expect(sourceTypes).toContain("completed_transaction");
    expect(prices.body.data.summary).not.toBeNull();

    const trends = await request(app)
      .get("/api/market/prices/trends")
      .query({
        produce_type_id: produceTypeId,
        state_or_region: "Plateau",
        unit: "kg",
        period: "month",
      })
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(trends.status, "price trends").toBe(200);
    expect(trends.body.data.trend.length).toBeGreaterThan(0);
    expect(trends.body.data.unit).toBe("kg");

    const comparisons = await request(app)
      .get("/api/market/prices/compare")
      .query({ produce_type_id: produceTypeId, unit: "kg" })
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(comparisons.status, "price comparison").toBe(200);
    expect(comparisons.body.data.comparisons.length).toBeGreaterThan(0);
    expect(comparisons.body.data.comparisons[0].state_or_region).toBe(
      "Plateau",
    );
  });

  it("returns supply, demand and transaction analytics", async () => {
    const supply = await request(app)
      .get("/api/market/analytics/supply")
      .query({ produce_type_id: produceTypeId, unit: "kg" })
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(supply.status, "supply analytics").toBe(200);
    expect(supply.body.data.summary).not.toBeNull();
    expect(supply.body.data.summary.total_available_quantity).toBeGreaterThan(
      0,
    );

    const demand = await request(app)
      .get("/api/market/analytics/demand")
      .query({ produce_type_id: produceTypeId, unit: "kg" })
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(demand.status, "demand analytics").toBe(200);
    expect(demand.body.data.summary).not.toBeNull();
    expect(demand.body.data.summary.active_request_count).toBeGreaterThan(0);
    expect(demand.body.data.summary.total_requested_quantity).toBe(500);

    const transactions = await request(app)
      .get("/api/market/analytics/transactions")
      .query({ produce_type_id: produceTypeId, unit: "kg" })
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(transactions.status, "transaction analytics").toBe(200);
    expect(transactions.body.data.summary).not.toBeNull();
    expect(transactions.body.data.summary.transaction_count).toBe(1);
    expect(transactions.body.data.summary.gross_revenue).toBeGreaterThan(0);
    expect(transactions.body.data.summary.refund_amount).toBe(0);
    expect(transactions.body.data.summary.net_revenue).toBe(
      transactions.body.data.summary.gross_revenue,
    );
  });
});

describe("Phase 13 market observations", () => {
  it("submits observations, prevents duplicates and requires admin approval", async () => {
    const payload = {
      produce_type_id: produceTypeId,
      market_name: "Jos Main Market",
      price_per_unit: 410,
      currency: "NGN",
      unit: "kg",
      quantity: 50,
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      observed_at: dateOffset(0),
      notes: "Verified at the morning market.",
    };

    const created = await request(app)
      .post("/api/market/observations")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send(payload);
    expect(created.status, "create observation").toBe(201);
    approvedObservationId = created.body.data.observation.id as string;
    expect(created.body.data.observation.status).toBe("pending");
    expect(created.body.data.observation.produce_type_name).not.toBeNull();

    const duplicate = await request(app)
      .post("/api/market/observations")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send(payload);
    expect(duplicate.status, "duplicate observation").toBe(409);

    const nonAdminApprove = await request(app)
      .post(`/api/admin/market/observations/${approvedObservationId}/approve`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({});
    expect(nonAdminApprove.status, "non-admin approve").toBe(403);

    const approved = await request(app)
      .post(`/api/admin/market/observations/${approvedObservationId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});
    expect(approved.status, "admin approve").toBe(200);
    expect(approved.body.data.observation.status).toBe("approved");

    const marketPrice = await MarketPrice.findOne({
      where: { market_observation_id: approvedObservationId },
    });
    expect(marketPrice, "approved price row").not.toBeNull();
    expect(marketPrice!.source_type).toBe("verified_market_observation");
    expect(Number(marketPrice!.price_per_unit)).toBe(410);

    const observationNotification = await Notification.findOne({
      where: {
        user_id: farmer.userId,
        notification_type: "market_observation_approved",
        related_entity_id: approvedObservationId,
      },
    });
    expect(observationNotification, "approval notification").not.toBeNull();

    const prices = await request(app)
      .get("/api/market/prices")
      .query({
        produce_type_id: produceTypeId,
        state_or_region: "Plateau",
        unit: "kg",
      })
      .set("Authorization", `Bearer ${buyer.token}`);
    const verified = prices.body.data.groups
      .flatMap(
        (group: {
          source_breakdown: Array<{ source_type: string }>;
        }) => group.source_breakdown,
      )
      .some(
        (row: { source_type: string }) =>
          row.source_type === "verified_market_observation",
      );
    expect(verified, "verified observation in prices").toBe(true);
  });

  it("rejects observations with a reason and notifies the submitter", async () => {
    const created = await request(app)
      .post("/api/market/observations")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_category_id: produceCategoryId,
        market_name: "Bukuru Evening Market",
        price_per_unit: 275,
        currency: "NGN",
        unit: "kg",
        state_or_region: "Plateau",
        observed_at: dateOffset(-1),
      });
    expect(created.status, "create rejectable observation").toBe(201);
    rejectedObservationId = created.body.data.observation.id as string;

    const rejected = await request(app)
      .post(`/api/admin/market/observations/${rejectedObservationId}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ reason: "Price could not be verified against the market sheet." });
    expect(rejected.status, "reject observation").toBe(200);
    expect(rejected.body.data.observation.status).toBe("rejected");
    expect(rejected.body.data.observation.rejection_reason).toContain(
      "could not be verified",
    );

    const notification = await Notification.findOne({
      where: {
        user_id: buyer.userId,
        notification_type: "market_observation_rejected",
        related_entity_id: rejectedObservationId,
      },
    });
    expect(notification, "rejection notification").not.toBeNull();

    const approvedPrice = await MarketPrice.findOne({
      where: { market_observation_id: rejectedObservationId },
    });
    expect(approvedPrice, "rejected observation has no price").toBeNull();
  });

  it("enforces cooperative-agent regional access", async () => {
    const allowed = await request(app)
      .get("/api/market/prices")
      .query({ state_or_region: "Plateau", unit: "kg" })
      .set("Authorization", `Bearer ${agent.token}`);
    expect(allowed.status, "agent allowed region").toBe(200);

    const forbidden = await request(app)
      .get("/api/market/prices")
      .query({ state_or_region: "Kano", unit: "kg" })
      .set("Authorization", `Bearer ${agent.token}`);
    expect(forbidden.status, "agent forbidden region").toBe(403);

    const unscoped = await request(app)
      .get("/api/market/prices")
      .query({ unit: "kg" })
      .set("Authorization", `Bearer ${agent.token}`);
    expect(unscoped.status, "agent scoped query").toBe(200);
    expect(
      unscoped.body.data.prices.every(
        (row: { state_or_region: string | null }) =>
          row.state_or_region?.toLowerCase() === "plateau",
      ),
    ).toBe(true);
  });
});

describe("Phase 13 market insights", () => {
  it("generates deterministic price and supply insights for admins", async () => {
    const previousPrices = [
      { days: -18, price: 100 },
      { days: -16, price: 100 },
      { days: -14, price: 110 },
    ];
    const currentPrices = [
      { days: -5, price: 220 },
      { days: -3, price: 230 },
      { days: -1, price: 240 },
    ];

    for (const item of [...previousPrices, ...currentPrices]) {
      await MarketPrice.create({
        produce_type_id: produceTypeId,
        produce_category_id: produceCategoryId,
        source_type: "approved_external_source",
        source_name: "Phase 13 External Market",
        price_per_unit: item.price,
        currency: "NGN",
        unit: "kg",
        country: "Nigeria",
        state_or_region: "Plateau",
        local_government_area: "Jos North",
        observed_at: dateOffset(item.days),
        is_verified: true,
        dedupe_key: `phase13-insight-${item.days}-${item.price}`,
      });
    }

    const nonAdmin = await request(app)
      .post("/api/admin/market/insights/generate")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        produce_type_id: produceTypeId,
        currency: "NGN",
        unit: "kg",
      });
    expect(nonAdmin.status, "non-admin insight generation").toBe(403);

    const generated = await request(app)
      .post("/api/admin/market/insights/generate")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        produce_type_id: produceTypeId,
        state_or_region: "Plateau",
        currency: "NGN",
        unit: "kg",
        date_from: dateOffset(-10),
        date_to: dateOffset(0),
      });
    expect(generated.status, "generate insights").toBe(201);
    expect(generated.body.data.generated).toBeGreaterThanOrEqual(1);

    const insightTypes = generated.body.data.insights.map(
      (insight: { insight_type: string }) => insight.insight_type,
    );
    expect(insightTypes).toContain("price_increase");
    expect(insightTypes).toContain("supply_shortage");

    const listed = await request(app)
      .get("/api/market/insights")
      .query({ produce_type_id: produceTypeId, unit: "kg" })
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(listed.status, "list insights").toBe(200);
    expect(listed.body.data.insights.length).toBeGreaterThanOrEqual(1);
    expect(
      listed.body.data.insights.every(
        (insight: { status: string }) => insight.status === "active",
      ),
    ).toBe(true);

    const dbInsight = await MarketInsight.findOne({
      where: { insight_type: "price_increase" },
    });
    expect(dbInsight, "persisted insight").not.toBeNull();
    expect(dbInsight!.dedupe_key).toContain("price_increase");

    const observation = await MarketObservation.findByPk(
      approvedObservationId,
    );
    expect(observation, "approved observation retained").not.toBeNull();
  });
});
