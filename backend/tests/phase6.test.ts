/**
 * Phase 6 — Buyer Requests and Marketplace Discovery
 *
 * Requires an isolated PostgreSQL test database.
 * Run with:
 *   TEST_DATABASE_URL=... TEST_DB_SSL=false npm test
 */

import request from "supertest";
import { beforeAll, describe, it, expect } from "vitest";
import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";

// ─── DB reset ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
}, 600_000);

// ─── Helpers ───────────────────────────────────────────────────────────────────

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234804${String(phoneCounter).padStart(8, "0")}`;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function registerAndLogin(
  phone: string,
  password = "TestPass1!",
): Promise<{ userId: string; token: string }> {
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

async function registerFarmerAndLogin(
  phone: string,
): Promise<{ userId: string; token: string }> {
  const { userId, token } = await registerAndLogin(phone);

  const res = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${token}`)
    .send({
      farm_name: `Farm of ${phone}`,
      farming_experience_years: 3,
    });
  expect(res.status, `create farmer profile for ${phone}`).toBe(201);

  return { userId, token };
}

async function createDraftListing(
  token: string,
  produceTypeId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const res = await request(app)
    .post("/api/listings")
    .set("Authorization", `Bearer ${token}`)
    .send({
      produce_type_id: produceTypeId,
      title: "Phase 6 Listing",
      quantity: 100,
      unit: "kg",
      price_per_unit: 250,
      currency: "NGN",
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      community: "Bukuru",
      ...overrides,
    });
  expect(res.status, "create draft listing").toBe(201);
  return res.body.data.listing.id as string;
}

async function publishListing(token: string, listingId: string): Promise<void> {
  const res = await request(app)
    .patch(`/api/listings/${listingId}/publish`)
    .set("Authorization", `Bearer ${token}`);
  expect(res.status, "publish listing").toBe(200);
}

let primaryTypeId: string;
let primaryCategoryId: string;
let buyer: { userId: string; token: string };
let otherBuyer: { userId: string; token: string };
let farmer: { userId: string; token: string };

async function createBuyerRequest(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post("/api/buyer-requests")
    .set("Authorization", `Bearer ${token}`)
    .send({
      produce_type_id: primaryTypeId,
      requested_quantity: 100,
      unit: "kg",
      preferred_location: "Jos",
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      community: "Bukuru",
      target_price_per_unit: 500,
      currency: "NGN",
      additional_requirements: "Standard phase 6 request",
      required_delivery_date: dateOffset(7),
      expiry_date: dateOffset(30),
      ...overrides,
    });
  expect(res.status, "create buyer request").toBe(201);
  return res.body.data.request as Record<string, unknown> & {
    id: string;
    produce_type_id: string | null;
    produce_category_id: string | null;
    status: string;
    is_active: boolean;
  };
}

async function createTypeAndCategory(
  overrides: { typeActive?: boolean; categoryActive?: boolean } = {},
) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { ProduceCategory, ProduceType } = await import(
    "../src/database/models/index.js"
  );

  const category = await ProduceCategory.create({
    name: `Phase 6 Category ${suffix}`,
    slug: `phase-6-category-${suffix}`,
    is_active: overrides.categoryActive ?? true,
  });
  const type = await ProduceType.create({
    category_id: category.id,
    name: `Phase 6 Type ${suffix}`,
    slug: `phase-6-type-${suffix}`,
    is_active: overrides.typeActive ?? true,
  });

  return { category, type };
}

beforeAll(async () => {
  const typesRes = await request(app).get("/api/produce/types");
  expect(typesRes.status).toBe(200);
  const types = typesRes.body.data.types as Array<{
    id: string;
    category_id: string;
  }>;
  expect(types.length).toBeGreaterThan(0);
  primaryTypeId = types[0]!.id;
  primaryCategoryId = types[0]!.category_id;

  buyer = await registerAndLogin(nextPhone());
  otherBuyer = await registerAndLogin(nextPhone());
  farmer = await registerFarmerAndLogin(nextPhone());

  const { User } = await import("../src/database/models/index.js");
  const buyerUser = await User.findByPk(buyer.userId);
  const otherUser = await User.findByPk(otherBuyer.userId);
  await buyerUser!.update({ display_name: "Phase 6 Buyer" });
  await otherUser!.update({ display_name: "Other Buyer" });
}, 120_000);

// ─── Create ───────────────────────────────────────────────────────────────────

describe("POST /api/buyer-requests", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/buyer-requests").send({
      produce_type_id: primaryTypeId,
      requested_quantity: 10,
      unit: "kg",
      expiry_date: dateOffset(10),
    });
    expect(res.status).toBe(401);
  });

  it("creates an open request, derives the category, and defaults currency", async () => {
    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: primaryTypeId,
        requested_quantity: 12.5,
        unit: "kg",
        preferred_location: "Jos",
        country: "Nigeria",
        state_or_region: "Plateau",
        local_government_area: "Jos North",
        community: "Bukuru",
        target_price_per_unit: 450.25,
        additional_requirements: "Needs clean produce",
        required_delivery_date: dateOffset(5),
        expiry_date: dateOffset(20),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request).toMatchObject({
      buyer_user_id: buyer.userId,
      produce_type_id: primaryTypeId,
      produce_category_id: primaryCategoryId,
      requested_quantity: 12.5,
      unit: "kg",
      target_price_per_unit: 450.25,
      currency: "NGN",
      status: "open",
      is_active: true,
    });
    expect(res.body.data.request.buyer).toEqual({
      id: buyer.userId,
      display_name: "Phase 6 Buyer",
    });
    expect(res.body.data.request.produce_type).toBeTruthy();
    expect(res.body.data.request.produce_category).toBeTruthy();
  });

  it("creates a category-only request", async () => {
    const { category } = await createTypeAndCategory();

    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_category_id: category.id,
        requested_quantity: 40,
        unit: "bags",
        expiry_date: dateOffset(20),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.request.produce_type_id).toBeNull();
    expect(res.body.data.request.produce_category_id).toBe(category.id);
  });

  it("normalizes currency to uppercase", async () => {
    const req = await createBuyerRequest(buyer.token, { currency: "usd" });
    expect(req.currency).toBe("USD");
  });

  it("rejects a request without a produce type or category", async () => {
    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        requested_quantity: 10,
        unit: "kg",
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("produce_type_id");
  });

  it("rejects zero or negative quantity", async () => {
    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: primaryTypeId,
        requested_quantity: 0,
        unit: "kg",
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("requested_quantity");
  });

  it("rejects a negative target price", async () => {
    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: primaryTypeId,
        requested_quantity: 10,
        unit: "kg",
        target_price_per_unit: -1,
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("target_price_per_unit");
  });

  it("rejects a past expiry date", async () => {
    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: primaryTypeId,
        requested_quantity: 10,
        unit: "kg",
        expiry_date: dateOffset(-1),
      });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("expiry_date");
  });

  it("rejects a past required delivery date", async () => {
    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: primaryTypeId,
        requested_quantity: 10,
        unit: "kg",
        required_delivery_date: dateOffset(-1),
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("required_delivery_date");
  });

  it("returns 404 for an unknown produce type", async () => {
    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: "00000000-0000-4000-8000-000000000000",
        requested_quantity: 10,
        unit: "kg",
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(404);
  });

  it("rejects a type/category mismatch", async () => {
    const { category: otherCategory } = await createTypeAndCategory();

    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: primaryTypeId,
        produce_category_id: otherCategory.id,
        requested_quantity: 10,
        unit: "kg",
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(422);
  });

  it("rejects an inactive produce type", async () => {
    const { type } = await createTypeAndCategory({ typeActive: false });

    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_type_id: type.id,
        requested_quantity: 10,
        unit: "kg",
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(422);
  });

  it("rejects an inactive produce category", async () => {
    const { category } = await createTypeAndCategory({ categoryActive: false });

    const res = await request(app)
      .post("/api/buyer-requests")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        produce_category_id: category.id,
        requested_quantity: 10,
        unit: "kg",
        expiry_date: dateOffset(10),
      });

    expect(res.status).toBe(422);
  });
});

// ─── Discovery ────────────────────────────────────────────────────────────────

describe("GET /api/buyer-requests", () => {
  it("returns only open, unexpired requests", async () => {
    const paused = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${paused.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const fulfilled = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${fulfilled.id}/fulfill`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const res = await request(app).get("/api/buyer-requests?limit=50");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.requests)).toBe(true);

    const ids = (res.body.data.requests as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(ids).not.toContain(paused.id);
    expect(ids).not.toContain(fulfilled.id);
    for (const item of res.body.data.requests as Array<{ status: string }>) {
      expect(item.status).toBe("open");
    }
  });

  it("filters by search text", async () => {
    const req = await createBuyerRequest(buyer.token, {
      additional_requirements: "unique-sesame-search-term",
    });

    const res = await request(app).get(
      "/api/buyer-requests?search=unique-sesame-search-term",
    );
    expect(res.status).toBe(200);
    expect(res.body.data.requests).toHaveLength(1);
    expect(res.body.data.requests[0].id).toBe(req.id);
  });

  it("filters by category slug and produce type", async () => {
    const { category, type } = await createTypeAndCategory();
    const req = await createBuyerRequest(buyer.token, {
      produce_type_id: type.id,
    });

    const byCategory = await request(app).get(
      `/api/buyer-requests?category_slug=${category.slug}`,
    );
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.data.requests.map((r: { id: string }) => r.id)).toContain(
      req.id,
    );

    const byType = await request(app).get(
      `/api/buyer-requests?produce_type_id=${type.id}`,
    );
    expect(byType.status).toBe(200);
    expect(byType.body.data.requests).toHaveLength(1);
    expect(byType.body.data.requests[0].id).toBe(req.id);
  });

  it("filters by location fields", async () => {
    const req = await createBuyerRequest(buyer.token, {
      preferred_location: "Unique Market Town",
      community: "Unique Community",
    });

    const res = await request(app).get(
      "/api/buyer-requests?location=Unique%20Market%20Town",
    );
    expect(res.status).toBe(200);
    expect(res.body.data.requests.map((r: { id: string }) => r.id)).toContain(
      req.id,
    );
  });

  it("filters by quantity and target price ranges", async () => {
    const { type } = await createTypeAndCategory();
    const req = await createBuyerRequest(buyer.token, {
      produce_type_id: type.id,
      requested_quantity: 55,
      target_price_per_unit: 321,
    });

    const res = await request(app).get(
      `/api/buyer-requests?produce_type_id=${type.id}&min_quantity=50&max_quantity=60&min_target_price=300&max_target_price=350`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.requests).toHaveLength(1);
    expect(res.body.data.requests[0].id).toBe(req.id);
  });

  it("filters by required delivery date range", async () => {
    const { type } = await createTypeAndCategory();
    const req = await createBuyerRequest(buyer.token, {
      produce_type_id: type.id,
      required_delivery_date: dateOffset(12),
    });

    const res = await request(app).get(
      `/api/buyer-requests?produce_type_id=${type.id}&required_delivery_after=${dateOffset(10)}&required_delivery_before=${dateOffset(15)}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.requests).toHaveLength(1);
    expect(res.body.data.requests[0].id).toBe(req.id);
  });

  it("sorts by delivery soonest", async () => {
    const { type } = await createTypeAndCategory();
    const later = await createBuyerRequest(buyer.token, {
      produce_type_id: type.id,
      required_delivery_date: dateOffset(20),
    });
    const sooner = await createBuyerRequest(buyer.token, {
      produce_type_id: type.id,
      required_delivery_date: dateOffset(5),
    });

    const res = await request(app).get(
      `/api/buyer-requests?produce_type_id=${type.id}&sort=delivery_soonest`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.requests.map((r: { id: string }) => r.id)).toEqual([
      sooner.id,
      later.id,
    ]);
  });

  it("paginates results", async () => {
    const { type } = await createTypeAndCategory();
    for (let index = 0; index < 3; index += 1) {
      await createBuyerRequest(buyer.token, {
        produce_type_id: type.id,
        additional_requirements: `paginated-${index}`,
      });
    }

    const first = await request(app).get(
      `/api/buyer-requests?produce_type_id=${type.id}&limit=2&page=1`,
    );
    expect(first.status).toBe(200);
    expect(first.body.data.requests).toHaveLength(2);
    expect(first.body.data.total).toBe(3);
    expect(first.body.data.total_pages).toBe(2);

    const second = await request(app).get(
      `/api/buyer-requests?produce_type_id=${type.id}&limit=2&page=2`,
    );
    expect(second.status).toBe(200);
    expect(second.body.data.requests).toHaveLength(1);
  });

  it("rejects an inverted quantity range", async () => {
    const res = await request(app).get(
      "/api/buyer-requests?min_quantity=100&max_quantity=10",
    );
    expect(res.status).toBe(422);
  });
});

// ─── My requests ──────────────────────────────────────────────────────────────

describe("GET /api/buyer-requests/me", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/buyer-requests/me");
    expect(res.status).toBe(401);
  });

  it("returns only the authenticated user's requests", async () => {
    const mine = await createBuyerRequest(buyer.token);
    const theirs = await createBuyerRequest(otherBuyer.token);

    const res = await request(app)
      .get("/api/buyer-requests/me?limit=50")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(200);

    const ids = (res.body.data.requests as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(theirs.id);
  });

  it("filters by status and includes inactive requests", async () => {
    const req = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${req.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const res = await request(app)
      .get("/api/buyer-requests/me?status=paused&limit=50")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.requests.map((r: { id: string }) => r.id)).toContain(
      req.id,
    );
    for (const item of res.body.data.requests as Array<{ status: string }>) {
      expect(item.status).toBe("paused");
    }
  });
});

// ─── Read one ─────────────────────────────────────────────────────────────────

describe("GET /api/buyer-requests/:id", () => {
  it("returns an open request without authentication", async () => {
    const req = await createBuyerRequest(buyer.token);

    const res = await request(app).get(`/api/buyer-requests/${req.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.request.id).toBe(req.id);
    expect(res.body.data.request.buyer).toEqual({
      id: buyer.userId,
      display_name: "Phase 6 Buyer",
    });
  });

  it("lets the owner read a paused request", async () => {
    const req = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${req.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const res = await request(app)
      .get(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe("paused");
  });

  it("hides a paused request from another user", async () => {
    const req = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${req.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const res = await request(app)
      .get(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${otherBuyer.token}`);
    expect(res.status).toBe(404);
  });

  it("rejects an invalid request id", async () => {
    const res = await request(app).get("/api/buyer-requests/not-a-uuid");
    expect(res.status).toBe(422);
  });

  it("returns 404 for an unknown request", async () => {
    const res = await request(app).get(
      "/api/buyer-requests/00000000-0000-4000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });

  it("does not expose private buyer contact details", async () => {
    const req = await createBuyerRequest(buyer.token);
    const res = await request(app).get(`/api/buyer-requests/${req.id}`);

    expect(res.status).toBe(200);
    const buyerData = res.body.data.request.buyer as Record<string, unknown>;
    expect(Object.keys(buyerData).sort()).toEqual(["display_name", "id"]);
    expect(JSON.stringify(res.body)).not.toContain("+234804");
  });
});

// ─── Update ───────────────────────────────────────────────────────────────────

describe("PUT /api/buyer-requests/:id", () => {
  it("updates an owned open request", async () => {
    const req = await createBuyerRequest(buyer.token);

    const res = await request(app)
      .put(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        requested_quantity: 250,
        unit: "tonnes",
        target_price_per_unit: 800,
        additional_requirements: "Updated requirements",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.request).toMatchObject({
      requested_quantity: 250,
      unit: "tonnes",
      target_price_per_unit: 800,
      additional_requirements: "Updated requirements",
    });
  });

  it("derives the new category when the produce type changes", async () => {
    const first = await createTypeAndCategory();
    const second = await createTypeAndCategory();
    const req = await createBuyerRequest(buyer.token, {
      produce_type_id: first.type.id,
    });

    const res = await request(app)
      .put(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ produce_type_id: second.type.id });

    expect(res.status).toBe(200);
    expect(res.body.data.request.produce_type_id).toBe(second.type.id);
    expect(res.body.data.request.produce_category_id).toBe(second.category.id);
  });

  it("rejects updating another user's request", async () => {
    const req = await createBuyerRequest(buyer.token);

    const res = await request(app)
      .put(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${otherBuyer.token}`)
      .send({ unit: "bags" });

    expect(res.status).toBe(403);
  });

  it("rejects updating a fulfilled request", async () => {
    const req = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${req.id}/fulfill`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const res = await request(app)
      .put(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ unit: "bags" });

    expect(res.status).toBe(422);
  });

  it("rejects clearing both produce references", async () => {
    const req = await createBuyerRequest(buyer.token);

    const res = await request(app)
      .put(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ produce_type_id: null, produce_category_id: null });

    expect(res.status).toBe(422);
  });

  it("rejects a type/category mismatch", async () => {
    const req = await createBuyerRequest(buyer.token);
    const { category } = await createTypeAndCategory();

    const res = await request(app)
      .put(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ produce_category_id: category.id });

    expect(res.status).toBe(422);
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe("Buyer request lifecycle", () => {
  it("pauses and reopens an open request", async () => {
    const req = await createBuyerRequest(buyer.token);

    const paused = await request(app)
      .patch(`/api/buyer-requests/${req.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(paused.status).toBe(200);
    expect(paused.body.data.request.status).toBe("paused");
    expect(paused.body.data.request.is_active).toBe(false);

    const reopened = await request(app)
      .patch(`/api/buyer-requests/${req.id}/reopen`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.request.status).toBe("open");
    expect(reopened.body.data.request.is_active).toBe(true);
  });

  it("fulfills and cancels requests", async () => {
    const fulfilled = await createBuyerRequest(buyer.token);
    const fulfillRes = await request(app)
      .patch(`/api/buyer-requests/${fulfilled.id}/fulfill`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(fulfillRes.status).toBe(200);
    expect(fulfillRes.body.data.request.status).toBe("fulfilled");

    const cancelled = await createBuyerRequest(buyer.token);
    const cancelRes = await request(app)
      .patch(`/api/buyer-requests/${cancelled.id}/cancel`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.request.status).toBe("cancelled");
  });

  it("rejects invalid transitions", async () => {
    const open = await createBuyerRequest(buyer.token);
    expect(
      (
        await request(app)
          .patch(`/api/buyer-requests/${open.id}/reopen`)
          .set("Authorization", `Bearer ${buyer.token}`)
      ).status,
    ).toBe(422);

    await request(app)
      .patch(`/api/buyer-requests/${open.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);
    expect(
      (
        await request(app)
          .patch(`/api/buyer-requests/${open.id}/pause`)
          .set("Authorization", `Bearer ${buyer.token}`)
      ).status,
    ).toBe(422);

    const cancelled = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${cancelled.id}/cancel`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);
    expect(
      (
        await request(app)
          .patch(`/api/buyer-requests/${cancelled.id}/fulfill`)
          .set("Authorization", `Bearer ${buyer.token}`)
      ).status,
    ).toBe(422);
  });

  it("rejects lifecycle changes by another user", async () => {
    const req = await createBuyerRequest(buyer.token);

    for (const action of ["pause", "fulfill", "cancel"]) {
      const res = await request(app)
        .patch(`/api/buyer-requests/${req.id}/${action}`)
        .set("Authorization", `Bearer ${otherBuyer.token}`);
      expect(res.status, action).toBe(403);
    }
  });

  it("cannot reopen an expired request", async () => {
    const req = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${req.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const { BuyerRequest } = await import("../src/database/models/index.js");
    await BuyerRequest.update(
      { expiry_date: dateOffset(-1) },
      { where: { id: req.id } },
    );

    const res = await request(app)
      .patch(`/api/buyer-requests/${req.id}/reopen`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(422);
  });
});

// ─── Expiry ───────────────────────────────────────────────────────────────────

describe("Buyer request expiry", () => {
  it("marks expired open requests and hides them from discovery", async () => {
    const req = await createBuyerRequest(buyer.token);
    const { BuyerRequest } = await import("../src/database/models/index.js");
    await BuyerRequest.update(
      { expiry_date: dateOffset(-1) },
      { where: { id: req.id } },
    );

    const discovery = await request(app).get(
      `/api/buyer-requests?search=Standard%20phase%206%20request&limit=50`,
    );
    expect(discovery.status).toBe(200);
    expect(
      discovery.body.data.requests.map((r: { id: string }) => r.id),
    ).not.toContain(req.id);

    const ownerRead = await request(app)
      .get(`/api/buyer-requests/${req.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(ownerRead.status).toBe(200);
    expect(ownerRead.body.data.request.status).toBe("expired");
    expect(ownerRead.body.data.request.is_active).toBe(false);

    const publicRead = await request(app).get(
      `/api/buyer-requests/${req.id}`,
    );
    expect(publicRead.status).toBe(404);
  });

  it("marks expired paused requests as expired", async () => {
    const req = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${req.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const { BuyerRequest } = await import("../src/database/models/index.js");
    await BuyerRequest.update(
      { expiry_date: dateOffset(-1) },
      { where: { id: req.id } },
    );

    const res = await request(app)
      .get("/api/buyer-requests/me?status=expired&limit=50")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(200);
    const expired = res.body.data.requests.find(
      (r: { id: string }) => r.id === req.id,
    );
    expect(expired).toBeTruthy();
    expect(expired.status).toBe("expired");
  });

  it("expires requests idempotently", async () => {
    const { expireBuyerRequests } = await import(
      "../src/modules/buyer-requests/buyer-requests.service.js"
    );
    await expireBuyerRequests();
    const secondRun = await expireBuyerRequests();
    expect(secondRun).toBe(0);
  });
});

// ─── Marketplace ──────────────────────────────────────────────────────────────

describe("Marketplace discovery", () => {
  it("requires authentication for listings and requests", async () => {
    expect((await request(app).get("/api/marketplace/listings")).status).toBe(
      401,
    );
    expect((await request(app).get("/api/marketplace/requests")).status).toBe(
      401,
    );
    expect(
      (
        await request(app).get(
          "/api/marketplace/listings/00000000-0000-4000-8000-000000000000",
        )
      ).status,
    ).toBe(401);
  });

  it("discovers published listings with currency and quantity filters", async () => {
    const usdListing = await createDraftListing(farmer.token, primaryTypeId, {
      title: "Phase 6 USD Listing",
      quantity: 10,
      currency: "USD",
    });
    const ngnListing = await createDraftListing(farmer.token, primaryTypeId, {
      title: "Phase 6 NGN Listing",
      quantity: 100,
      currency: "NGN",
    });
    await publishListing(farmer.token, usdListing);
    await publishListing(farmer.token, ngnListing);

    const usd = await request(app)
      .get("/api/marketplace/listings?currency=usd&limit=50")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(usd.status).toBe(200);
    expect(
      usd.body.data.listings.map((l: { id: string }) => l.id),
    ).toContain(usdListing);
    expect(
      usd.body.data.listings.map((l: { id: string }) => l.id),
    ).not.toContain(ngnListing);

    const maxQuantity = await request(app)
      .get("/api/marketplace/listings?max_quantity=20&limit=50")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(maxQuantity.status).toBe(200);
    for (const listing of maxQuantity.body.data.listings as Array<{
      available_quantity: number;
    }>) {
      expect(listing.available_quantity).toBeLessThanOrEqual(20);
    }

    const sorted = await request(app)
      .get("/api/marketplace/listings?sort=quantity_asc&limit=50")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(sorted.status).toBe(200);
    const quantities = (
      sorted.body.data.listings as Array<{ available_quantity: number }>
    ).map((l) => l.available_quantity);
    expect(quantities).toEqual([...quantities].sort((a, b) => a - b));
  });

  it("only exposes published, available listings by id", async () => {
    const draft = await createDraftListing(farmer.token, primaryTypeId, {
      title: "Phase 6 Draft Listing",
    });
    const draftRes = await request(app)
      .get(`/api/marketplace/listings/${draft}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(draftRes.status).toBe(404);

    const published = await createDraftListing(farmer.token, primaryTypeId, {
      title: "Phase 6 Published Listing",
    });
    await publishListing(farmer.token, published);
    const publishedRes = await request(app)
      .get(`/api/marketplace/listings/${published}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(publishedRes.status).toBe(200);
    expect(publishedRes.body.data.listing.id).toBe(published);

    await request(app)
      .patch(`/api/listings/${published}/pause`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .expect(200);
    const pausedRes = await request(app)
      .get(`/api/marketplace/listings/${published}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(pausedRes.status).toBe(404);
  });

  it("only exposes open buyer requests", async () => {
    const open = await createBuyerRequest(buyer.token);
    const paused = await createBuyerRequest(buyer.token);
    await request(app)
      .patch(`/api/buyer-requests/${paused.id}/pause`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .expect(200);

    const list = await request(app)
      .get("/api/marketplace/requests?limit=50")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(list.status).toBe(200);
    const ids = (list.body.data.requests as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(ids).toContain(open.id);
    expect(ids).not.toContain(paused.id);

    const openRead = await request(app)
      .get(`/api/marketplace/requests/${open.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(openRead.status).toBe(200);

    const pausedRead = await request(app)
      .get(`/api/marketplace/requests/${paused.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(pausedRead.status).toBe(404);
  });
});
