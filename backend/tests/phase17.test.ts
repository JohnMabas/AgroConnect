/**
 * Phase 17 — USSD, Voice/IVR and rural accessibility integration.
 *
 * External telecom and SMS/email providers are mocked. No real calls or
 * messages are sent.
 */

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { setEmailProvider } from "../src/integrations/email/index.js";
import { setSmsProvider } from "../src/integrations/sms/index.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  Offer,
  PhoneOtp,
  ProduceListing,
  ProduceType,
  Role,
  UssdSession,
  User,
  UserRole,
  VoiceCallEvent,
} from "../src/database/models/index.js";
import { hashOtp } from "../src/services/otp.service.js";

setEmailProvider({
  sendEmail: async () => ({ provider_reference: "test-email" }),
});
setSmsProvider({
  sendSms: async () => ({ provider_reference: "test-sms" }),
});

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

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function registerAndLogin(): Promise<AuthUser> {
  const phone = nextPhone();
  const password = "TestPass1!";
  const reg = await request(app).post("/api/auth/register").send({
    phone_number: phone,
    password,
    password_confirm: password,
  });
  expect(reg.status, `register ${phone}`).toBe(201);
  const userId = reg.body.data.user.id as string;

  await PhoneOtp.update(
    { otp_hash: hashOtp("171717") },
    { where: { user_id: userId, used: false } },
  );
  expect(
    (await request(app)
      .post("/api/auth/verify-phone")
      .send({ user_id: userId, otp: "171717" })).status,
  ).toBe(200);

  const login = await request(app).post("/api/auth/login").send({
    identifier: phone,
    password,
  });
  expect(login.status, `login ${phone}`).toBe(200);
  return { userId, token: login.body.data.access_token as string, phone };
}

async function roleId(name: string): Promise<string> {
  const role = await Role.findOne({ where: { name } });
  expect(role, `role ${name}`).not.toBeNull();
  return role!.id;
}

async function addRole(userId: string, name: string): Promise<void> {
  const id = await roleId(name);
  await UserRole.findOrCreate({
    where: { user_id: userId, role_id: id },
    defaults: { user_id: userId, role_id: id },
  });
}

async function removeRole(userId: string, name: string): Promise<void> {
  const id = await roleId(name);
  await UserRole.destroy({ where: { user_id: userId, role_id: id } });
}

function ussd(phoneNumber: string, sessionId: string, text: string) {
  return request(app).post("/api/ussd").type("form").send({
    sessionId,
    phoneNumber,
    networkCode: "62130",
    serviceCode: "*384*123#",
    text,
  });
}

function voice(
  callerNumber: string,
  sessionId: string,
  dtmfDigits: string,
  isActive = "1",
) {
  return request(app).post("/api/voice").type("form").send({
    sessionId,
    callerNumber,
    destinationNumber: "+2347000000000",
    direction: "Inbound",
    isActive,
    dtmfDigits,
  });
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
      title: "Phase 17 Offer Listing",
      quantity: 20,
      unit: "bag",
      price_per_unit: 45000,
      currency: "NGN",
      country: "Nigeria",
      state_or_region: "Plateau",
      collection_location: "Bokkos",
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

let farmer: AuthUser;
let buyer: AuthUser;
let admin: AuthUser;
let firstProduce: ProduceType;
let offerListingId: string;
let offerId: string;

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();

  farmer = await registerAndLogin();
  buyer = await registerAndLogin();
  admin = await registerAndLogin();

  const farmerProfile = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${farmer.token}`)
    .send({ farm_name: "Phase 17 Farm", farming_experience_years: 5 });
  expect(farmerProfile.status).toBe(201);

  // Make the buyer account buyer-only so the role-specific USSD menu is used.
  await removeRole(buyer.userId, "farmer");
  await addRole(buyer.userId, "buyer");
  await addRole(admin.userId, "admin");

  const types = await ProduceType.findAll({
    where: { is_active: true },
    order: [["name", "ASC"]],
    limit: 5,
  });
  expect(types.length).toBeGreaterThan(0);
  firstProduce = types[0]!;

  offerListingId = await createPublishedListing(farmer.token, firstProduce.id);

  const offer = await request(app)
    .post("/api/offers")
    .set("Authorization", `Bearer ${buyer.token}`)
    .send({
      listing_id: offerListingId,
      quantity: 5,
      unit: "bag",
      unit_price: 45000,
      currency: "NGN",
      expires_at: dateOffset(3),
    });
  expect(offer.status, "create offer").toBe(201);
  offerId = offer.body.data.offer.id as string;
}, 1_800_000);

describe("Phase 17 USSD callback and registration", () => {
  it("rejects malformed provider callbacks safely", async () => {
    const res = await request(app).post("/api/ussd").type("form").send({
      sessionId: "",
      phoneNumber: "",
    });
    expect(res.status).toBe(400);
    expect(res.text).toContain("END");
  });

  it("shows the guest menu and completes registration with phone verification", async () => {
    const phone = nextPhone();
    const sessionId = "ussd-registration-1";

    const welcome = await ussd(phone, sessionId, "");
    expect(welcome.status).toBe(200);
    expect(welcome.text.startsWith("CON")).toBe(true);
    expect(welcome.text).toContain("Register");

    const namePrompt = await ussd(phone, sessionId, "1");
    expect(namePrompt.text).toContain("Enter your full name");

    const otpPrompt = await ussd(phone, sessionId, "1*USSD Farmer");
    expect(otpPrompt.status).toBe(200);
    expect(otpPrompt.text.startsWith("CON")).toBe(true);
    expect(otpPrompt.text).toContain("OTP");

    const user = await User.findOne({ where: { phone_number: phone } });
    expect(user, "user created through USSD").not.toBeNull();
    await PhoneOtp.update(
      { otp_hash: hashOtp("171717") },
      { where: { user_id: user!.id, used: false } },
    );

    const verified = await ussd(phone, sessionId, "1*USSD Farmer*171717");
    expect(verified.status).toBe(200);
    expect(verified.text.startsWith("CON")).toBe(true);
    expect(verified.text).toContain("Registration received");

    await user!.reload();
    expect(user!.status).toBe("active");
  });
});

describe("Phase 17 USSD produce listing", () => {
  let listingSession: string;
  let listingText: string;
  let createdListingId: string | null = null;

  it("lists produce through the existing catalogue and inventory services", async () => {
    listingSession = "ussd-listing-1";
    const title = `${firstProduce.name} - 20 bag`;

    const steps: Array<[string, string]> = [
      ["", "CON"],
      ["1", "CON"],
      ["1*1", "CON"],
      ["1*1*20", "CON"],
      ["1*1*20*2", "CON"],
      ["1*1*20*2*45000", "CON"],
      ["1*1*20*2*45000*Jos North", "CON"],
      ["1*1*20*2*45000*Jos North*1", "END"],
    ];

    for (const [text, prefix] of steps) {
      const res = await ussd(farmer.phone, listingSession, text);
      expect(res.status, `ussd step ${text}`).toBe(200);
      expect(res.text.startsWith(prefix), `step ${text}: ${res.text}`).toBe(
        true,
      );
      listingText = text;
    }

    const listing = await ProduceListing.findOne({
      where: { farmer_user_id: farmer.userId, title },
    });
    expect(listing, "listing created via USSD").not.toBeNull();
    expect(listing!.status).toBe("published");
    expect(Number(listing!.quantity)).toBe(20);
    expect(Number(listing!.price_per_unit)).toBe(45000);
    expect(listing!.unit).toBe("bag");
    expect(listing!.collection_location).toBe("Jos North");
    createdListingId = listing!.id;
  });

  it("returns the cached response and does not duplicate the listing on retry", async () => {
    const before = await ProduceListing.count({
      where: {
        farmer_user_id: farmer.userId,
        title: `${firstProduce.name} - 20 bag`,
      },
    });
    expect(before).toBe(1);

    const retry = await ussd(farmer.phone, listingSession, listingText);
    expect(retry.status).toBe(200);
    expect(retry.text.startsWith("END")).toBe(true);

    const after = await ProduceListing.count({
      where: {
        farmer_user_id: farmer.userId,
        title: `${firstProduce.name} - 20 bag`,
      },
    });
    expect(after).toBe(1);
    expect(createdListingId).not.toBeNull();
  });

  it("rejects zero quantity without creating a listing", async () => {
    const sessionId = "ussd-invalid-quantity";
    await ussd(farmer.phone, sessionId, "");
    await ussd(farmer.phone, sessionId, "1");
    await ussd(farmer.phone, sessionId, "1*1");
    const invalid = await ussd(farmer.phone, sessionId, "1*1*0");
    expect(invalid.status).toBe(200);
    expect(invalid.text.startsWith("CON")).toBe(true);
    expect(invalid.text).toContain("Invalid option");
    expect(invalid.text).toContain("Enter quantity");
  });

  it("rejects unsupported unit selections", async () => {
    const sessionId = "ussd-invalid-unit";
    await ussd(farmer.phone, sessionId, "");
    await ussd(farmer.phone, sessionId, "1");
    await ussd(farmer.phone, sessionId, "1*1");
    await ussd(farmer.phone, sessionId, "1*1*5");
    const invalid = await ussd(farmer.phone, sessionId, "1*1*5*99");
    expect(invalid.status).toBe(200);
    expect(invalid.text.startsWith("CON")).toBe(true);
    expect(invalid.text).toContain("Select unit");
  });
});

describe("Phase 17 USSD offers, orders and market prices", () => {
  it("requires explicit confirmation before accepting an offer", async () => {
    const sessionId = "ussd-offer-accept";
    const main = await ussd(farmer.phone, sessionId, "");
    expect(main.text).toContain("Farmer menu");

    const offers = await ussd(farmer.phone, sessionId, "4");
    expect(offers.text.startsWith("CON")).toBe(true);
    expect(offers.text).toContain("Pending offers");

    const decision = await ussd(farmer.phone, sessionId, "4*1");
    expect(decision.text).toContain("Accept");

    const confirm = await ussd(farmer.phone, sessionId, "4*1*1");
    expect(confirm.text.startsWith("CON")).toBe(true);
    expect(confirm.text).toContain("Press 1 to confirm");

    const accepted = await ussd(farmer.phone, sessionId, "4*1*1*1");
    expect(accepted.text.startsWith("END")).toBe(true);
    expect(accepted.text).toContain("Offer accepted");

    const stored = await Offer.findByPk(offerId);
    expect(stored!.status).toBe("accepted");

    const retry = await ussd(farmer.phone, sessionId, "4*1*1*1");
    expect(retry.text.startsWith("END")).toBe(true);
    const stillAccepted = await Offer.findByPk(offerId);
    expect(stillAccepted!.status).toBe("accepted");
  });

  it("shows order status from verified backend records only", async () => {
    const sessionId = "ussd-orders";
    await ussd(farmer.phone, sessionId, "");
    const orders = await ussd(farmer.phone, sessionId, "5");
    expect(orders.status).toBe(200);
    expect(orders.text.startsWith("END")).toBe(true);
    expect(orders.text).toContain("no orders");
  });

  it("serves market prices without inventing data", async () => {
    const sessionId = "ussd-market";
    await ussd(farmer.phone, sessionId, "");
    const produceMenu = await ussd(farmer.phone, sessionId, "6");
    expect(produceMenu.text.startsWith("CON")).toBe(true);
    const result = await ussd(farmer.phone, sessionId, "6*1");
    expect(result.status).toBe(200);
    expect(result.text.startsWith("END")).toBe(true);
  });

  it("gives buyers a role-specific menu and produce discovery", async () => {
    const sessionId = "ussd-buyer";
    const main = await ussd(buyer.phone, sessionId, "");
    expect(main.text).toContain("Buyer menu");
    expect(main.text).toContain("Browse produce");

    const produceMenu = await ussd(buyer.phone, sessionId, "1");
    expect(produceMenu.text.startsWith("CON")).toBe(true);
    expect(produceMenu.text).toContain("Browse produce");

    const browse = await ussd(buyer.phone, sessionId, "1*1");
    expect(browse.status).toBe(200);
    expect(browse.text.startsWith("END")).toBe(true);
  });
});

describe("Phase 17 voice/IVR", () => {
  it("handles an incoming call, language selection and keypad navigation", async () => {
    const sessionId = "voice-1";

    const welcome = await voice(farmer.phone, sessionId, "");
    expect(welcome.status).toBe(200);
    expect(welcome.type).toContain("xml");
    expect(welcome.text).toContain("<GetDigits");
    expect(welcome.text).toContain("Farmer menu");

    const languageMenu = await voice(farmer.phone, sessionId, "7");
    expect(languageMenu.text).toContain("Select language");

    const saved = await voice(farmer.phone, sessionId, "1");
    expect(saved.text).toContain("Language saved");

    const hangup = await voice(farmer.phone, sessionId, "0");
    expect(hangup.text).toContain("<Hangup");
  });

  it("deduplicates identical voice callbacks", async () => {
    const sessionId = "voice-dedupe";
    await voice(farmer.phone, sessionId, "");

    const first = await voice(farmer.phone, sessionId, "7");
    const second = await voice(farmer.phone, sessionId, "7");
    expect(second.status).toBe(200);
    expect(second.text).toBe(first.text);

    const events = await VoiceCallEvent.count();
    expect(events).toBeGreaterThan(0);
  });

  it("handles call termination callbacks safely", async () => {
    const sessionId = "voice-end";
    await voice(farmer.phone, sessionId, "");
    const ended = await voice(farmer.phone, sessionId, "", "0");
    expect(ended.status).toBe(200);
    expect(ended.text).toContain("Goodbye");
  });
});

describe("Phase 17 localization", () => {
  it("lists supported languages and falls back to English for critical messages", async () => {
    const languages = await request(app).get("/api/localization/languages");
    expect(languages.status).toBe(200);
    expect(
      languages.body.data.languages.some(
        (item: { code: string }) => item.code === "en",
      ),
    ).toBe(true);

    const messages = await request(app).get(
      "/api/localization/messages?language=ha",
    );
    expect(messages.status).toBe(200);
    expect(messages.body.data.language).toBe("ha");
    expect(messages.body.data.messages["listing.published"]).toBe(
      "Listing published. Buyers can now find your produce.",
    );
  });

  it("stores a validated language preference for the current user", async () => {
    const updated = await request(app)
      .patch("/api/users/my-language")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ preferred_language: "ha" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.language.preferred_language).toBe("ha");

    const current = await request(app)
      .get("/api/users/my-language")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(current.status).toBe(200);
    expect(current.body.data.language.preferred_language).toBe("ha");

    const invalid = await request(app)
      .patch("/api/users/my-language")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ preferred_language: "xx" });
    expect(invalid.status).toBe(422);
  });
});

describe("Phase 17 telecom administration and security", () => {
  it("restricts telecom administration to admins", async () => {
    const forbidden = await request(app)
      .get("/api/admin/telecom/config")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get("/api/admin/telecom/config")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.provider).toBe("africastalking");
    expect(allowed.body.data.supported_languages.length).toBeGreaterThan(0);
  });

  it("restricts USSD session inspection to the session owner", async () => {
    const sessionId = "ussd-owner-check";
    await ussd(farmer.phone, sessionId, "");
    const session = await UssdSession.findOne({
      where: { provider_session_id: sessionId },
    });
    expect(session).not.toBeNull();

    const own = await request(app)
      .get(`/api/ussd/session/${session!.id}`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(own.status).toBe(200);

    const other = await request(app)
      .get(`/api/ussd/session/${session!.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(other.status).toBe(403);

    const anonymous = await request(app).get(
      `/api/ussd/session/${session!.id}`,
    );
    expect(anonymous.status).toBe(401);
  });
});
