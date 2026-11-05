/**
 * Phase 5 — Produce Catalogue, Listings, Images, Inventory
 *
 * Requires an isolated PostgreSQL test database.
 * Run with:
 *   TEST_DATABASE_URL=... TEST_DB_SSL=true TEST_DB_SSL_VERIFY=false npm test
 *
 * The setup resets the public schema, applies all migrations, and seeds the
 * produce catalogue before any test runs.
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
});

// ─── Phone counter ─────────────────────────────────────────────────────────────

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  const suffix = String(phoneCounter).padStart(8, "0");
  return `+234803${suffix}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

/**
 * Register a user, create their farmer profile, and log in.
 * Returns { userId, token }.
 */
async function registerFarmerAndLogin(
  phone: string,
  password = "TestPass1!",
): Promise<{ userId: string; token: string }> {
  const { userId, token } = await registerAndLogin(phone, password);

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

/**
 * Fetch the first produce type from the catalogue.
 */
async function getFirstProduceTypeId(): Promise<string> {
  const res = await request(app).get("/api/produce/types");
  expect(res.status).toBe(200);
  const types = res.body.data.types as Array<{ id: string }>;
  expect(types.length).toBeGreaterThan(0);
  return types[0]!.id;
}

/**
 * Create a draft listing for a farmer.
 */
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
      title: "Fresh Maize Harvest",
      quantity: 100,
      unit: "kg",
      price_per_unit: 250,
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

// ─── Produce Catalogue ─────────────────────────────────────────────────────────

describe("GET /api/produce/categories", () => {
  it("returns 200 with at least 8 seeded categories", async () => {
    const res = await request(app).get("/api/produce/categories");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    expect(res.body.data.categories.length).toBeGreaterThanOrEqual(8);
  });

  it("each category has id, name, slug, is_active fields", async () => {
    const res = await request(app).get("/api/produce/categories");

    expect(res.status).toBe(200);
    const categories = res.body.data.categories as Array<{
      id: string;
      name: string;
      slug: string;
      is_active: boolean;
    }>;
    for (const cat of categories) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.slug).toBeTruthy();
      expect(typeof cat.is_active).toBe("boolean");
    }
  });
});

describe("GET /api/produce/types", () => {
  it("returns 200 with an array of types", async () => {
    const res = await request(app).get("/api/produce/types");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.types)).toBe(true);
    expect(res.body.data.types.length).toBeGreaterThan(0);
  });

  it("filters by category_slug=grains-and-cereals and all results belong to that category", async () => {
    const res = await request(app).get(
      "/api/produce/types?category_slug=grains-and-cereals",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const types = res.body.data.types as Array<{
      category: { slug: string };
    }>;
    expect(types.length).toBeGreaterThan(0);
    for (const t of types) {
      expect(t.category.slug).toBe("grains-and-cereals");
    }
  });
});

describe("GET /api/produce/types/:id", () => {
  it("returns 200 for a valid produce type id", async () => {
    // Get any id from the list first
    const list = await request(app).get("/api/produce/types");
    const typeId = (list.body.data.types as Array<{ id: string }>)[0]!.id;

    const res = await request(app).get(`/api/produce/types/${typeId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type.id).toBe(typeId);
  });

  it("returns 404 for a non-existent produce type id", async () => {
    const res = await request(app).get(
      "/api/produce/types/00000000-0000-0000-0000-000000000000",
    );

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── Listings — create ─────────────────────────────────────────────────────────

describe("POST /api/listings", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/listings")
      .send({ title: "Some produce", quantity: 10, unit: "kg", price_per_unit: 100 });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no farmer profile", async () => {
    const { token } = await registerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        produce_type_id: produceTypeId,
        title: "No Farmer Profile Listing",
        quantity: 50,
        unit: "kg",
        price_per_unit: 200,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("creates a draft listing with farmer profile and valid data → 201, status=draft", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        produce_type_id: produceTypeId,
        title: "Fresh Maize Harvest",
        quantity: 100,
        unit: "kg",
        price_per_unit: 250,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.listing.status).toBe("draft");
    expect(res.body.data.listing.title).toBe("Fresh Maize Harvest");
    expect(res.body.data.listing.quantity).toBe(100);
    expect(res.body.data.listing.available_quantity).toBe(100);
  });

  it("returns 422 when quantity is zero", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        produce_type_id: produceTypeId,
        title: "Zero Quantity Listing",
        quantity: 0,
        unit: "kg",
        price_per_unit: 250,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("returns 422 when price is negative", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        produce_type_id: produceTypeId,
        title: "Negative Price Listing",
        quantity: 100,
        unit: "kg",
        price_per_unit: -10,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when produce_type_id does not exist", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());

    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        produce_type_id: "00000000-0000-0000-0000-000000000000",
        title: "Bad Type Listing",
        quantity: 100,
        unit: "kg",
        price_per_unit: 250,
      });

    // Service throws NOT_FOUND (404) for missing produce type
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

// ─── Listings — read ───────────────────────────────────────────────────────────

describe("GET /api/listings/me", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/listings/me");
    expect(res.status).toBe(401);
  });

  it("returns 200 with array of listings for authenticated user", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    // Create a listing so there's at least one
    await createDraftListing(token, produceTypeId);

    const res = await request(app)
      .get("/api/listings/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.listings)).toBe(true);
    expect(res.body.data.listings.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/listings (public discovery)", () => {
  const marker = `Discovery-${Date.now()}`;
  let token = "";
  let produceTypeId = "";
  let categorySlug = "";
  let firstId = "";
  let secondId = "";
  let thirdId = "";
  let draftId = "";
  let pausedId = "";

  beforeAll(async () => {
    const farmer = await registerFarmerAndLogin(nextPhone());
    token = farmer.token;

    const typesRes = await request(app).get("/api/produce/types");
    expect(typesRes.status).toBe(200);
    const firstType = (typesRes.body.data.types as Array<{
      id: string;
      category: { slug: string };
    }>)[0]!;
    produceTypeId = firstType.id;
    categorySlug = firstType.category.slug;

    async function makePublished(overrides: Record<string, unknown>): Promise<string> {
      const id = await createDraftListing(token, produceTypeId, overrides);
      await publishListing(token, id);
      return id;
    }

    firstId = await makePublished({
      title: `${marker} Maize`,
      quantity: 81,
      price_per_unit: 5001,
      state_or_region: "Zaria-Discovery",
    });
    secondId = await makePublished({
      title: `${marker} Millet`,
      quantity: 42,
      price_per_unit: 6002,
      state_or_region: "Zaria-Discovery",
    });
    thirdId = await makePublished({
      title: `${marker} Sorghum`,
      quantity: 17,
      price_per_unit: 7003,
      state_or_region: "Other-Discovery",
    });
    draftId = await createDraftListing(token, produceTypeId, {
      title: `${marker} Draft`,
      quantity: 5,
      price_per_unit: 8004,
      state_or_region: "Zaria-Discovery",
    });
    pausedId = await createDraftListing(token, produceTypeId, {
      title: `${marker} Paused`,
      quantity: 6,
      price_per_unit: 9005,
      state_or_region: "Zaria-Discovery",
    });
    await publishListing(token, pausedId);
    const pauseRes = await request(app)
      .patch(`/api/listings/${pausedId}/pause`)
      .set("Authorization", `Bearer ${token}`);
    expect(pauseRes.status).toBe(200);
  });

  it("returns only published, available listings without authentication", async () => {
    const res = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const listings = res.body.data.listings as Array<{ id: string; status: string }>;
    const ids = listings.map((listing) => listing.id);
    expect(ids).toEqual(expect.arrayContaining([firstId, secondId, thirdId]));
    expect(ids).not.toContain(draftId);
    expect(ids).not.toContain(pausedId);
    expect(listings.every((listing) => listing.status === "published")).toBe(true);
    expect(res.body.data.total).toBe(3);
  });

  it("searches by title case-insensitively", async () => {
    const res = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker.toUpperCase())}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
  });

  it("filters by category slug and produce type", async () => {
    const byCategory = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&category_slug=${categorySlug}`,
    );
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.data.total).toBe(3);

    const byType = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&produce_type_id=${produceTypeId}`,
    );
    expect(byType.status).toBe(200);
    expect(byType.body.data.total).toBe(3);
  });

  it("filters by partial location", async () => {
    const res = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&location=Zaria`,
    );

    expect(res.status).toBe(200);
    const ids = (res.body.data.listings as Array<{ id: string }>).map((l) => l.id);
    expect(ids.sort()).toEqual([firstId, secondId].sort());
  });

  it("filters by price range and minimum quantity", async () => {
    const priceRes = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&min_price=5001&max_price=6002`,
    );
    expect(priceRes.status).toBe(200);
    expect(priceRes.body.data.total).toBe(2);

    const quantityRes = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&min_quantity=50`,
    );
    expect(quantityRes.status).toBe(200);
    // Only the 81-unit listing meets the 50-unit minimum.
    expect(quantityRes.body.data.total).toBe(1);
  });

  it("paginates results and supports price sorting", async () => {
    const firstPage = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&limit=1&page=1&sort=price_asc`,
    );
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.listings).toHaveLength(1);
    expect(firstPage.body.data.listings[0].id).toBe(firstId);
    expect(firstPage.body.data.total).toBe(3);
    expect(firstPage.body.data.total_pages).toBe(3);

    const secondPage = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&limit=1&page=2&sort=price_asc`,
    );
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.listings[0].id).toBe(secondId);

    const descending = await request(app).get(
      `/api/listings?search=${encodeURIComponent(marker)}&sort=price_desc`,
    );
    expect(descending.body.data.listings[0].id).toBe(thirdId);
  });

  it("rejects invalid query parameters", async () => {
    const badSort = await request(app).get("/api/listings?sort=oldest");
    expect(badSort.status).toBe(422);

    const badLimit = await request(app).get("/api/listings?limit=51");
    expect(badLimit.status).toBe(422);

    const badRange = await request(app).get(
      "/api/listings?min_price=900&max_price=100",
    );
    expect(badRange.status).toBe(422);
  });
});

describe("GET /api/listings/:id (public)", () => {
  it("returns 200 for a published listing (public access)", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);
    await publishListing(token, listingId);

    const res = await request(app).get(`/api/listings/${listingId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.listing.id).toBe(listingId);
    expect(res.body.data.listing.status).toBe("published");
    expect(res.body.data.listing.is_available).toBe(true);
  });

  it("returns 404 for a non-existent listing id", async () => {
    const res = await request(app).get(
      "/api/listings/00000000-0000-0000-0000-000000000000",
    );

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for another user's draft listing", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(farmerA.token, produceTypeId);

    const res = await request(app).get(`/api/listings/${listingId}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("allows the owner to read their own draft with a bearer token", async () => {
    const farmer = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(farmer.token, produceTypeId);

    const res = await request(app)
      .get(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${farmer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("draft");
  });

  it("returns 200 for another farmer's published listing (public read)", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(farmerA.token, produceTypeId);
    await publishListing(farmerA.token, listingId);

    await registerFarmerAndLogin(nextPhone());

    const res = await request(app).get(`/api/listings/${listingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.listing.id).toBe(listingId);
  });
});

// ─── Listings — update and status transitions ──────────────────────────────────

describe("PUT /api/listings/:id", () => {
  it("returns 403 when another farmer tries to update", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const farmerB = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const listingId = await createDraftListing(farmerA.token, produceTypeId);

    const res = await request(app)
      .put(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${farmerB.token}`)
      .send({ title: "Hijacked title" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("Status transitions", () => {
  it("PATCH /:id/publish → 200, status becomes published", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const res = await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.listing.status).toBe("published");
  });

  it("PATCH /:id/pause → 200 from published, status becomes paused", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    // Publish first
    await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/listings/${listingId}/pause`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("paused");
  });

  it("PATCH /:id/resume → 200 from paused, status becomes published", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    // Publish then pause
    await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${token}`);
    await request(app)
      .patch(`/api/listings/${listingId}/pause`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/listings/${listingId}/resume`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("published");
  });

  it("PATCH /:id/close → 200, status becomes closed", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    // Publish so we can close it
    await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/listings/${listingId}/close`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("closed");
  });

  it("DELETE /:id deletes a draft listing → 200", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const res = await request(app)
      .delete(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /:id returns 422 for a published listing", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    // Publish it so it's no longer draft
    await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .delete(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});


// ─── Listing lifecycle and validation ─────────────────────────────────────────

describe("Listing lifecycle and validation", () => {
  it("rejects publishing a listing whose expiry date has passed", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      expiry_date: "2000-01-01",
    });

    const res = await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("marks expired published listings as expired and unavailable on read", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      expiry_date: "2000-01-01",
    });

    const { ProduceListing } = await import("../src/database/models/index.js");
    await ProduceListing.update(
      { status: "published" },
      { where: { id: listingId } },
    );

    const res = await request(app).get(`/api/listings/${listingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("expired");
    expect(res.body.data.listing.is_available).toBe(false);
  });

  it("cannot resume a closed listing", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);
    await publishListing(token, listingId);

    await request(app)
      .patch(`/api/listings/${listingId}/close`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/listings/${listingId}/resume`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("keeps adjustment history when a listing is closed", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);
    await publishListing(token, listingId);

    await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ adjustment_type: "stock_added", quantity_change: 5 });

    await request(app)
      .patch(`/api/listings/${listingId}/close`)
      .set("Authorization", `Bearer ${token}`);

    const history = await request(app)
      .get(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`);

    expect(history.status).toBe(200);
    expect(history.body.data.adjustments.length).toBe(1);
  });

  it("prevents deleting a draft that has inventory history", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ adjustment_type: "stock_added", quantity_change: 5 });

    const res = await request(app)
      .delete(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("ignores attempts to set reserved or sold quantities directly", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 100,
    });

    const update = await request(app)
      .put(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        reserved_quantity: 10,
        sold_quantity: 5,
        available_quantity: 1,
      });

    expect(update.status).toBe(200);
    const inventory = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${token}`);
    expect(inventory.body.data.inventory.reserved_quantity).toBe(0);
    expect(inventory.body.data.inventory.sold_quantity).toBe(0);
    expect(inventory.body.data.inventory.available_quantity).toBe(100);
  });

  it("cannot reduce total quantity below reserved plus sold", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 100,
    });

    const { ProduceListing } = await import("../src/database/models/index.js");
    await ProduceListing.update(
      {
        available_quantity: 50,
        reserved_quantity: 30,
        sold_quantity: 20,
      },
      { where: { id: listingId } },
    );

    const res = await request(app)
      .put(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 40 });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("rejects publishing when the produce type has been deactivated", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const { ProduceType } = await import("../src/database/models/index.js");
    await ProduceType.update({ is_active: false }, { where: { id: produceTypeId } });

    const res = await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);

    await ProduceType.update({ is_active: true }, { where: { id: produceTypeId } });
  });
});

// ─── Listing Images ────────────────────────────────────────────────────────────

describe("Listing images", () => {
  it("POST /:id/images without token → 401", async () => {
    const res = await request(app)
      .post("/api/listings/00000000-0000-0000-0000-000000000000/images")
      .send({ image_url: "https://example.com/img.jpg" });

    expect(res.status).toBe(401);
  });

  it("POST /:id/images by non-owner → 403", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const farmerB = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const listingId = await createDraftListing(farmerA.token, produceTypeId);

    const res = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${farmerB.token}`)
      .send({ image_url: "https://example.com/img.jpg" });

    expect(res.status).toBe(403);
  });

  it("POST /:id/images with valid image_url → 201, first image is_primary=true", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const res = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .send({ image_url: "https://example.com/maize1.jpg" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.image.is_primary).toBe(true);
    expect(res.body.data.image.listing_id).toBe(listingId);
  });

  it("POST second image → 201, first image stays primary", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    // Add first image
    const first = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .send({ image_url: "https://example.com/img1.jpg" });
    expect(first.status).toBe(201);
    const firstImageId = first.body.data.image.id as string;

    // Add second image
    const second = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .send({ image_url: "https://example.com/img2.jpg" });
    expect(second.status).toBe(201);
    expect(second.body.data.image.is_primary).toBe(false);

    // Verify the listing still has first image as primary via the listing endpoint
    const listing = await request(app)
      .get(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${token}`);
    const images = listing.body.data.listing.images as Array<{
      id: string;
      is_primary: boolean;
    }>;
    const primary = images.find((img) => img.id === firstImageId);
    expect(primary?.is_primary).toBe(true);
  });

  it("PATCH /:id/images/:imageId/primary → 200, that image becomes primary", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    // Add two images
    await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .send({ image_url: "https://example.com/a.jpg" });
    const img2 = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .send({ image_url: "https://example.com/b.jpg" });

    const secondImageId = img2.body.data.image.id as string;

    // Set second image as primary
    const res = await request(app)
      .patch(`/api/listings/${listingId}/images/${secondImageId}/primary`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.image.is_primary).toBe(true);
    expect(res.body.data.image.id).toBe(secondImageId);
  });

  it("DELETE /:id/images/:imageId → 200", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const addRes = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .send({ image_url: "https://example.com/delete-me.jpg" });
    const imageId = addRes.body.data.image.id as string;

    const res = await request(app)
      .delete(`/api/listings/${listingId}/images/${imageId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ─── Listing image uploads ────────────────────────────────────────────────────

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function pngBuffer(extraBytes = 32): Buffer {
  return Buffer.concat([PNG_HEADER, Buffer.alloc(extraBytes, 0)]);
}

describe("Listing image uploads", () => {
  it("accepts a valid PNG upload and stores it outside the database", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const res = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", pngBuffer(), {
        filename: "produce.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const imageUrl = res.body.data.image.image_url as string;
    expect(imageUrl).toMatch(/^\/uploads\/listings\//);
    expect(res.body.data.image.storage_key).toBeUndefined();

    const served = await request(app).get(imageUrl);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toMatch(/image\/png/);
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects executable/unsafe content even when the extension is .png", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const res = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("<script>alert(1)</script>"), {
        filename: "malicious.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("rejects unsupported upload MIME types", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const res = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("plain text"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("rejects uploads larger than the configured limit", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    const oversized = Buffer.concat([
      PNG_HEADER,
      Buffer.alloc(6 * 1024 * 1024, 0),
    ]);

    const res = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", oversized, {
        filename: "too-large.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("limits the number of images per listing", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId);

    for (let index = 0; index < 5; index += 1) {
      const upload = await request(app)
        .post(`/api/listings/${listingId}/images`)
        .set("Authorization", `Bearer ${token}`)
        .attach("image", pngBuffer(32 + index), {
          filename: `image-${index}.png`,
          contentType: "image/png",
        });
      expect(upload.status).toBe(201);
    }

    const sixth = await request(app)
      .post(`/api/listings/${listingId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .attach("image", pngBuffer(), {
        filename: "image-6.png",
        contentType: "image/png",
      });

    expect(sixth.status).toBe(422);
    expect(sixth.body.success).toBe(false);
  });
});

// ─── Inventory ─────────────────────────────────────────────────────────────────

describe("Inventory", () => {
  it("GET /:id/inventory without token → 401", async () => {
    const res = await request(app).get(
      "/api/listings/00000000-0000-0000-0000-000000000000/inventory",
    );
    expect(res.status).toBe(401);
  });

  it("GET /:id/inventory by non-owner → 403", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const farmerB = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(farmerA.token, produceTypeId);

    const res = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${farmerB.token}`);

    expect(res.status).toBe(403);
  });

  it("GET /:id/inventory → 200, returns inventory summary", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 50,
    });

    const res = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const inventory = res.body.data.inventory;
    expect(inventory.listing_id).toBe(listingId);
    expect(inventory.quantity).toBe(50);
    expect(inventory.available_quantity).toBe(50);
  });

  it("POST /:id/inventory/adjustments stock_added → 200, available_quantity increases", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 100,
    });

    const res = await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        adjustment_type: "stock_added",
        quantity_change: 25,
        reason: "Additional harvest",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const adj = res.body.data.adjustment;
    expect(adj.adjustment_type).toBe("stock_added");
    expect(adj.quantity_change).toBe(25);
    expect(adj.new_available_quantity).toBe(125);

    // Confirm inventory reflects the change
    const inv = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${token}`);
    expect(inv.body.data.inventory.available_quantity).toBe(125);
  });

  it("POST /:id/inventory/adjustments stock_removed → available_quantity decreases", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 100,
    });

    const res = await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        adjustment_type: "stock_removed",
        quantity_change: 30,
        reason: "Damaged stock",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.adjustment.new_available_quantity).toBe(70);
  });

  it("POST stock_removed with quantity > available → 422 (INVALID_OPERATION)", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 10,
    });

    const res = await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        adjustment_type: "stock_removed",
        quantity_change: 999,
      });

    expect([409, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("GET /:id/inventory/adjustments → 200, paginated list", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 200,
    });

    // Create a couple of adjustments
    await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ adjustment_type: "stock_added", quantity_change: 10 });

    await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ adjustment_type: "stock_removed", quantity_change: 5 });

    const res = await request(app)
      .get(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.adjustments)).toBe(true);
    expect(res.body.data.adjustments.length).toBeGreaterThanOrEqual(2);
    expect(typeof res.body.data.total).toBe("number");
    expect(typeof res.body.data.total_pages).toBe("number");
  });
});


describe("Inventory invariants and concurrency", () => {
  it("records signed stock_removed deltas and keeps the total balanced", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 100,
    });

    const removed = await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ adjustment_type: "stock_removed", quantity_change: 30 });

    expect(removed.status).toBe(201);
    expect(removed.body.data.adjustment.quantity_change).toBe(-30);

    const inventory = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${token}`);

    const summary = inventory.body.data.inventory;
    expect(summary.available_quantity).toBe(70);
    expect(summary.quantity).toBe(70);
    expect(summary.is_balanced).toBe(true);
  });

  it("supports correction adjustments without breaking the invariant", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 100,
    });

    const corrected = await request(app)
      .post(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ adjustment_type: "correction", quantity_change: 80 });

    expect(corrected.status).toBe(201);
    expect(corrected.body.data.adjustment.previous_available_quantity).toBe(100);
    expect(corrected.body.data.adjustment.new_available_quantity).toBe(80);
    expect(corrected.body.data.adjustment.quantity_change).toBe(-20);

    const inventory = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${token}`);
    expect(inventory.body.data.inventory.quantity).toBe(80);
    expect(inventory.body.data.inventory.is_balanced).toBe(true);
  });

  it("serializes concurrent adjustments without corrupting stock", async () => {
    const { token } = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();
    const listingId = await createDraftListing(token, produceTypeId, {
      quantity: 100,
    });

    const results = await Promise.all([
      request(app)
        .post(`/api/listings/${listingId}/inventory/adjustments`)
        .set("Authorization", `Bearer ${token}`)
        .send({ adjustment_type: "stock_added", quantity_change: 10 }),
      request(app)
        .post(`/api/listings/${listingId}/inventory/adjustments`)
        .set("Authorization", `Bearer ${token}`)
        .send({ adjustment_type: "stock_added", quantity_change: 15 }),
    ]);

    expect(results.map((r) => r.status)).toEqual([201, 201]);

    const inventory = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${token}`);
    expect(inventory.body.data.inventory.available_quantity).toBe(125);
    expect(inventory.body.data.inventory.quantity).toBe(125);

    const history = await request(app)
      .get(`/api/listings/${listingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${token}`);
    expect(history.body.data.adjustments.length).toBe(2);
  });
});

// ─── Security ──────────────────────────────────────────────────────────────────

describe("Security — unauthenticated access to farmer-protected routes", () => {
  it("POST /api/listings → 401", async () => {
    const res = await request(app)
      .post("/api/listings")
      .send({ title: "No auth" });
    expect(res.status).toBe(401);
  });

  it("GET /api/listings/me → 401", async () => {
    const res = await request(app).get("/api/listings/me");
    expect(res.status).toBe(401);
  });

  it("PUT /api/listings/:id → 401", async () => {
    const res = await request(app)
      .put("/api/listings/00000000-0000-0000-0000-000000000000")
      .send({ title: "No auth" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/listings/:id/publish → 401", async () => {
    const res = await request(app).patch(
      "/api/listings/00000000-0000-0000-0000-000000000000/publish",
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/listings/:id/pause → 401", async () => {
    const res = await request(app).patch(
      "/api/listings/00000000-0000-0000-0000-000000000000/pause",
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/listings/:id/resume → 401", async () => {
    const res = await request(app).patch(
      "/api/listings/00000000-0000-0000-0000-000000000000/resume",
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/listings/:id/close → 401", async () => {
    const res = await request(app).patch(
      "/api/listings/00000000-0000-0000-0000-000000000000/close",
    );
    expect(res.status).toBe(401);
  });

  it("DELETE /api/listings/:id → 401", async () => {
    const res = await request(app).delete(
      "/api/listings/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/listings/:id/images → 401", async () => {
    const res = await request(app)
      .post("/api/listings/00000000-0000-0000-0000-000000000000/images")
      .send({ image_url: "https://example.com/x.jpg" });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/listings/:id/images/:imageId → 401", async () => {
    const res = await request(app).delete(
      "/api/listings/00000000-0000-0000-0000-000000000000/images/00000000-0000-0000-0000-000000000001",
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/listings/:id/images/:imageId/primary → 401", async () => {
    const res = await request(app).patch(
      "/api/listings/00000000-0000-0000-0000-000000000000/images/00000000-0000-0000-0000-000000000001/primary",
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/listings/:id/inventory → 401", async () => {
    const res = await request(app).get(
      "/api/listings/00000000-0000-0000-0000-000000000000/inventory",
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/listings/:id/inventory/adjustments → 401", async () => {
    const res = await request(app)
      .post("/api/listings/00000000-0000-0000-0000-000000000000/inventory/adjustments")
      .send({ adjustment_type: "stock_added", quantity_change: 5 });
    expect(res.status).toBe(401);
  });

  it("GET /api/listings/:id/inventory/adjustments → 401", async () => {
    const res = await request(app).get(
      "/api/listings/00000000-0000-0000-0000-000000000000/inventory/adjustments",
    );
    expect(res.status).toBe(401);
  });
});

describe("Security — IDOR protection", () => {
  it("farmer cannot edit another farmer's listing (403)", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const farmerB = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const listingId = await createDraftListing(farmerA.token, produceTypeId);

    const res = await request(app)
      .put(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${farmerB.token}`)
      .send({ title: "IDOR attempt" });

    expect(res.status).toBe(403);
  });

  it("farmer cannot access inventory of another farmer's listing (403)", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const farmerB = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const listingId = await createDraftListing(farmerA.token, produceTypeId);

    const res = await request(app)
      .get(`/api/listings/${listingId}/inventory`)
      .set("Authorization", `Bearer ${farmerB.token}`);

    expect(res.status).toBe(403);
  });

  it("farmer cannot publish another farmer's listing (403)", async () => {
    const farmerA = await registerFarmerAndLogin(nextPhone());
    const farmerB = await registerFarmerAndLogin(nextPhone());
    const produceTypeId = await getFirstProduceTypeId();

    const listingId = await createDraftListing(farmerA.token, produceTypeId);

    const res = await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${farmerB.token}`);

    expect(res.status).toBe(403);
  });
});
