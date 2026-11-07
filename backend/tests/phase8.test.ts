/**
 * Phase 8 — Offers and Negotiation
 *
 * Requires an isolated PostgreSQL test database.
 * Run with:
 *   TEST_DATABASE_URL=... TEST_DB_SSL=false npm test
 */

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  Offer,
  OfferEvent,
  ProduceListing,
} from "../src/database/models/index.js";

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
}, 600_000);

interface AuthUser {
  userId: string;
  token: string;
}

interface OfferPayload {
  id: string;
  offer_number: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  conversation_id: string | null;
  buyer_id: string;
  farmer_id: string;
  created_by: string;
  recipient_user_id: string;
  parent_offer_id: string | null;
  root_offer_id: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  expired_at: string | null;
  countered_at: string | null;
  buyer?: { id: string; display_name: string | null };
  farmer?: { id: string; display_name: string | null };
  listing?: { id: string; farmer_user_id: string };
  buyer_request?: { id: string; buyer_user_id: string };
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234806${String(phoneCounter).padStart(8, "0")}`;
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
      farm_name: `Phase 8 Farm of ${phone}`,
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
      title: "Phase 8 Offer Listing",
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
  expect(created.status, "create listing").toBe(201);
  const listingId = created.body.data.listing.id as string;

  const published = await request(app)
    .patch(`/api/listings/${listingId}/publish`)
    .set("Authorization", `Bearer ${token}`);
  expect(published.status, "publish listing").toBe(200);

  return listingId;
}

async function createBuyerRequest(
  token: string,
  produceTypeId: string,
): Promise<string> {
  const res = await request(app)
    .post("/api/buyer-requests")
    .set("Authorization", `Bearer ${token}`)
    .send({
      produce_type_id: produceTypeId,
      requested_quantity: 50,
      unit: "kg",
      preferred_location: "Jos",
      country: "Nigeria",
      state_or_region: "Plateau",
      currency: "NGN",
      expiry_date: dateOffset(30),
    });
  expect(res.status, "create buyer request").toBe(201);
  return res.body.data.request.id as string;
}

function offerBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    quantity: 10,
    unit: "kg",
    unit_price: 240,
    currency: "NGN",
    delivery_terms: "Buyer collects from the farm gate.",
    delivery_location: "Bukuru, Jos South",
    delivery_date: dateOffset(5),
    buyer_message: "Please confirm the quality and availability.",
    expires_at: dateOffset(3),
    ...overrides,
  };
}

function createOffer(token: string, body: Record<string, unknown>) {
  return request(app)
    .post("/api/offers")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

async function registerOffer(
  token: string,
  body: Record<string, unknown>,
): Promise<OfferPayload> {
  const res = await createOffer(token, body);
  expect(res.status, "create offer").toBe(201);
  return res.body.data.offer as OfferPayload;
}

function offerAction(
  token: string,
  offerId: string,
  action: string,
  body: Record<string, unknown> = {},
) {
  return request(app)
    .post(`/api/offers/${offerId}/${action}`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

let farmer: AuthUser;
let buyer: AuthUser;
let outsider: AuthUser;
let produceTypeId: string;
let listingId: string;
let buyerRequestId: string;
let primaryOffer: OfferPayload;

beforeAll(async () => {
  farmer = await registerFarmerAndLogin(nextPhone());
  buyer = await registerAndLogin(nextPhone());
  outsider = await registerAndLogin(nextPhone());

  const { User } = await import("../src/database/models/index.js");
  await (await User.findByPk(farmer.userId))!.update({
    display_name: "Phase 8 Farmer",
  });
  await (await User.findByPk(buyer.userId))!.update({
    display_name: "Phase 8 Buyer",
  });

  produceTypeId = await getFirstProduceTypeId();
  listingId = await createPublishedListing(farmer.token, produceTypeId);
  buyerRequestId = await createBuyerRequest(buyer.token, produceTypeId);

  primaryOffer = await registerOffer(buyer.token, {
    listing_id: listingId,
    ...offerBody(),
  });
}, 180_000);

describe("Phase 8 authentication and offer creation", () => {
  it("requires authentication for offer endpoints", async () => {
    const list = await request(app).get("/api/offers");
    const create = await request(app)
      .post("/api/offers")
      .send({ listing_id: listingId, ...offerBody() });
    const accept = await request(app).post(
      `/api/offers/${primaryOffer.id}/accept`,
    );

    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
    expect(accept.status).toBe(401);
  });

  it("creates a structured pending offer with derived participants and total", async () => {
    expect(primaryOffer).toMatchObject({
      listing_id: listingId,
      buyer_request_id: null,
      buyer_id: buyer.userId,
      farmer_id: farmer.userId,
      created_by: buyer.userId,
      recipient_user_id: farmer.userId,
      quantity: 10,
      unit: "kg",
      unit_price: 240,
      total_amount: 2400,
      currency: "NGN",
      status: "pending",
      parent_offer_id: null,
      root_offer_id: null,
    });
    expect(primaryOffer.offer_number).toMatch(/^OFF-\d{8}-[A-F0-9]{10}$/);
    expect(primaryOffer.buyer).toMatchObject({ id: buyer.userId });
    expect(primaryOffer.farmer).toMatchObject({ id: farmer.userId });
    expect(primaryOffer.listing).toMatchObject({
      id: listingId,
      farmer_user_id: farmer.userId,
    });
    expect(primaryOffer.expires_at).toBeTruthy();

    const event = await OfferEvent.findOne({
      where: { offer_id: primaryOffer.id, action: "created" },
    });
    expect(event).not.toBeNull();
    expect(event!.actor_user_id).toBe(buyer.userId);
  });

  it("validates offer terms and requires a marketplace context", async () => {
    const missingContext = await createOffer(buyer.token, offerBody());
    const zeroQuantity = await createOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ quantity: 0 }),
    });
    const zeroPrice = await createOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ unit_price: 0 }),
    });
    const pastExpiry = await createOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ expires_at: dateOffset(-1) }),
    });

    expect(missingContext.status).toBe(422);
    expect(zeroQuantity.status).toBe(422);
    expect(zeroPrice.status).toBe(422);
    expect(pastExpiry.status).toBe(422);
  });

  it("rejects offers on your own listing and offers exceeding availability", async () => {
    const ownListing = await createOffer(farmer.token, {
      listing_id: listingId,
      ...offerBody(),
    });
    const tooLarge = await createOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ quantity: 101 }),
    });
    const wrongUnit = await createOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ unit: "tonne" }),
    });
    const wrongCurrency = await createOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ currency: "USD" }),
    });

    expect(ownListing.status).toBe(422);
    expect(tooLarge.status).toBe(422);
    expect(wrongUnit.status).toBe(422);
    expect(wrongCurrency.status).toBe(422);
  });
});

describe("Offer access and discovery", () => {
  it("allows participants to read an offer and hides it from outsiders", async () => {
    const buyerView = await request(app)
      .get(`/api/offers/${primaryOffer.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    const farmerView = await request(app)
      .get(`/api/offers/${primaryOffer.id}`)
      .set("Authorization", `Bearer ${farmer.token}`);
    const outsiderView = await request(app)
      .get(`/api/offers/${primaryOffer.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);

    expect(buyerView.status).toBe(200);
    expect(farmerView.status).toBe(200);
    expect(outsiderView.status).toBe(404);
  });

  it("filters offers by role, direction, status, and marketplace context", async () => {
    const sent = await request(app)
      .get("/api/offers?direction=sent&status=pending")
      .set("Authorization", `Bearer ${buyer.token}`);
    const received = await request(app)
      .get("/api/offers?direction=received")
      .set("Authorization", `Bearer ${farmer.token}`);
    const byListing = await request(app)
      .get(`/api/offers?listing_id=${listingId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    const outsiderList = await request(app)
      .get("/api/offers")
      .set("Authorization", `Bearer ${outsider.token}`);

    expect(sent.status).toBe(200);
    expect(received.status).toBe(200);
    expect(byListing.status).toBe(200);
    expect(
      sent.body.data.offers.map((offer: OfferPayload) => offer.id),
    ).toContain(primaryOffer.id);
    expect(
      received.body.data.offers.map((offer: OfferPayload) => offer.id),
    ).toContain(primaryOffer.id);
    expect(byListing.body.data.offers).toHaveLength(1);
    expect(outsiderList.body.data.offers).toHaveLength(0);
  });

  it("exposes owner-only offer lists from listings and buyer requests", async () => {
    const listingOffers = await request(app)
      .get(`/api/listings/${listingId}/offers`)
      .set("Authorization", `Bearer ${farmer.token}`);
    const listingOffersAsBuyer = await request(app)
      .get(`/api/listings/${listingId}/offers`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(listingOffers.status).toBe(200);
    expect(
      listingOffers.body.data.offers.map((offer: OfferPayload) => offer.id),
    ).toContain(primaryOffer.id);
    expect(listingOffersAsBuyer.status).toBe(403);

    const requestOffers = await request(app)
      .get(`/api/buyer-requests/${buyerRequestId}/offers`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(requestOffers.status).toBe(200);
  });
});

describe("Offer lifecycle", () => {
  it("only lets the recipient accept a pending offer without reserving inventory", async () => {
    const before = await ProduceListing.findByPk(listingId);
    const creatorAccept = await offerAction(
      buyer.token,
      primaryOffer.id,
      "accept",
    );
    const outsiderAccept = await offerAction(
      outsider.token,
      primaryOffer.id,
      "accept",
    );

    expect(creatorAccept.status).toBe(403);
    expect(outsiderAccept.status).toBe(404);

    const accepted = await offerAction(
      farmer.token,
      primaryOffer.id,
      "accept",
    );
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.offer).toMatchObject({
      status: "accepted",
    });
    expect(accepted.body.data.offer.accepted_at).toBeTruthy();

    const after = await ProduceListing.findByPk(listingId);
    expect(Number(after!.available_quantity)).toBe(
      Number(before!.available_quantity),
    );
    expect(Number(after!.reserved_quantity)).toBe(
      Number(before!.reserved_quantity),
    );
    expect(Number(after!.sold_quantity)).toBe(Number(before!.sold_quantity));

    const again = await offerAction(farmer.token, primaryOffer.id, "accept");
    const rejected = await offerAction(
      farmer.token,
      primaryOffer.id,
      "reject",
    );
    expect(again.status).toBe(422);
    expect(rejected.status).toBe(422);
  });

  it("supports counteroffers, preserves negotiation history, and accepts the latest offer", async () => {
    const original = await registerOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ quantity: 5, unit_price: 230 }),
    });

    const farmerCounter = await offerAction(
      farmer.token,
      original.id,
      "counter",
      offerBody({ quantity: 6, unit_price: 220 }),
    );
    expect(farmerCounter.status).toBe(201);
    const firstCounter = farmerCounter.body.data
      .offer as OfferPayload;
    expect(firstCounter).toMatchObject({
      parent_offer_id: original.id,
      root_offer_id: original.id,
      created_by: farmer.userId,
      recipient_user_id: buyer.userId,
      status: "pending",
      total_amount: 1320,
    });
    expect(
      farmerCounter.body.data.countered_offer,
    ).toMatchObject({
      id: original.id,
      status: "countered",
    });
    expect(
      farmerCounter.body.data.countered_offer.countered_at,
    ).toBeTruthy();

    const buyerCounter = await offerAction(
      buyer.token,
      firstCounter.id,
      "counter",
      offerBody({ quantity: 7, unit_price: 225 }),
    );
    expect(buyerCounter.status).toBe(201);
    const secondCounter = buyerCounter.body.data.offer as OfferPayload;
    expect(secondCounter).toMatchObject({
      parent_offer_id: firstCounter.id,
      root_offer_id: original.id,
      created_by: buyer.userId,
      recipient_user_id: farmer.userId,
    });

    const accepted = await offerAction(
      farmer.token,
      secondCounter.id,
      "accept",
    );
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.offer.status).toBe("accepted");

    const history = await request(app)
      .get(`/api/offers/${secondCounter.id}/history`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.history.root_offer_id).toBe(original.id);
    expect(
      history.body.data.history.offers.map(
        (offer: OfferPayload) => offer.id,
      ),
    ).toEqual([original.id, firstCounter.id, secondCounter.id]);
    expect(history.body.data.history.offers[0].status).toBe("countered");
    expect(history.body.data.history.offers[1].status).toBe("countered");
    expect(history.body.data.history.offers[2].status).toBe("accepted");
    expect(
      history.body.data.history.events.some(
        (event: { action: string }) => event.action === "countered",
      ),
    ).toBe(true);
    expect(
      history.body.data.history.events.some(
        (event: { action: string }) => event.action === "accepted",
      ),
    ).toBe(true);
  });

  it("allows only the creator to withdraw a pending offer", async () => {
    const offer = await registerOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ quantity: 2 }),
    });

    const recipientWithdraw = await offerAction(
      farmer.token,
      offer.id,
      "withdraw",
    );
    expect(recipientWithdraw.status).toBe(403);

    const withdrawn = await offerAction(
      buyer.token,
      offer.id,
      "withdraw",
    );
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.offer.status).toBe("withdrawn");
    expect(withdrawn.body.data.offer.withdrawn_at).toBeTruthy();

    const accept = await offerAction(farmer.token, offer.id, "accept");
    expect(accept.status).toBe(422);
  });

  it("lets the recipient reject an offer and blocks later acceptance", async () => {
    const offer = await registerOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ quantity: 3 }),
    });

    const rejected = await offerAction(farmer.token, offer.id, "reject");
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.offer.status).toBe("rejected");
    expect(rejected.body.data.offer.rejected_at).toBeTruthy();

    const accept = await offerAction(farmer.token, offer.id, "accept");
    expect(accept.status).toBe(422);
  });

  it("expires overdue offers and blocks acceptance", async () => {
    const offer = await registerOffer(buyer.token, {
      listing_id: listingId,
      ...offerBody({ quantity: 4 }),
    });

    await Offer.update(
      { expires_at: new Date(Date.now() - 60_000) },
      { where: { id: offer.id } },
    );

    const read = await request(app)
      .get(`/api/offers/${offer.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(read.status).toBe(200);
    expect(read.body.data.offer.status).toBe("expired");
    expect(read.body.data.offer.expired_at).toBeTruthy();

    const accept = await offerAction(farmer.token, offer.id, "accept");
    expect(accept.status).toBe(422);

    const expiredEvent = await OfferEvent.findOne({
      where: { offer_id: offer.id, action: "expired" },
    });
    expect(expiredEvent).not.toBeNull();
  });

  it("does not accept an offer after listing availability falls below its quantity", async () => {
    const limitedListingId = await createPublishedListing(
      farmer.token,
      produceTypeId,
      {
        title: "Phase 8 Limited Stock Listing",
        quantity: 20,
      },
    );
    const offer = await registerOffer(buyer.token, {
      listing_id: limitedListingId,
      ...offerBody({ quantity: 15 }),
    });

    const adjustment = await request(app)
      .post(`/api/listings/${limitedListingId}/inventory/adjustments`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        adjustment_type: "stock_removed",
        quantity_change: 10,
        reason: "Inventory changed after the offer was sent",
      });
    expect(adjustment.status).toBe(201);

    const accept = await offerAction(farmer.token, offer.id, "accept");
    expect(accept.status).toBe(422);
    expect(accept.body.error.message).toMatch(/available quantity/i);
  });
});

describe("Buyer request offers", () => {
  it("lets a farmer offer against a buyer request and the buyer accept", async () => {
    const created = await request(app)
      .post("/api/offers")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        buyer_request_id: buyerRequestId,
        ...offerBody({
          quantity: 20,
          unit_price: 500,
          listing_id: undefined,
        }),
      });

    expect(created.status).toBe(201);
    const offer = created.body.data.offer as OfferPayload;
    expect(offer).toMatchObject({
      listing_id: null,
      buyer_request_id: buyerRequestId,
      buyer_id: buyer.userId,
      farmer_id: farmer.userId,
      created_by: farmer.userId,
      recipient_user_id: buyer.userId,
      total_amount: 10000,
      status: "pending",
    });
    expect(offer.buyer_request).toMatchObject({
      id: buyerRequestId,
      buyer_user_id: buyer.userId,
    });

    const ownerOffer = await createOffer(buyer.token, {
      buyer_request_id: buyerRequestId,
      ...offerBody(),
    });
    expect(ownerOffer.status).toBe(422);

    const accepted = await offerAction(buyer.token, offer.id, "accept");
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.offer.status).toBe("accepted");
  });

  it("allows an offer linked to both a listing and a buyer request", async () => {
    const created = await createOffer(buyer.token, {
      listing_id: listingId,
      buyer_request_id: buyerRequestId,
      ...offerBody({ quantity: 1 }),
    });
    expect(created.status).toBe(201);
    expect(created.body.data.offer).toMatchObject({
      listing_id: listingId,
      buyer_request_id: buyerRequestId,
      buyer_id: buyer.userId,
      farmer_id: farmer.userId,
    });

    const outsiderOffer = await createOffer(outsider.token, {
      listing_id: listingId,
      buyer_request_id: buyerRequestId,
      ...offerBody(),
    });
    expect(outsiderOffer.status).toBe(403);
  });
});
