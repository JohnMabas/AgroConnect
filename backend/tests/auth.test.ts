/**
 * Phase 3 — Authentication tests
 *
 * These tests require a running isolated PostgreSQL test database.
 * Run with:
 *   TEST_DATABASE_URL=... TEST_DB_SSL=true TEST_DB_SSL_VERIFY=false npm test
 *
 * The setup.ts file resets the public schema before each test file, so tests
 * always start with a clean database (all Phase 2 + Phase 3 migrations applied).
 */

import request from "supertest";
import { beforeAll, describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";

// ─── Test helpers ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Reset schema and run all migrations + role seeder.
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
});

// ─── Registration ─────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("registers with phone only", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        phone_number: "+2348031111001",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.phone_number).toBe("+2348031111001");
    expect(res.body.data.user.email).toBeNull();
    expect(res.body.data.phone_otp_pending).toBe(true);
    // Password hash must never appear in responses.
    expect(JSON.stringify(res.body)).not.toContain("argon2");
    expect(JSON.stringify(res.body)).not.toContain("hash");
  });

  it("registers with email only", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        display_name: "Test User",
        email: "emailonly@example.com",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("emailonly@example.com");
    expect(res.body.data.user.phone_number).toBeNull();
    expect(res.body.data.email_verification_pending).toBe(true);
  });

  it("registers with both phone and email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        phone_number: "+2348031111002",
        email: "both@example.com",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.phone_number).toBe("+2348031111002");
    expect(res.body.data.user.email).toBe("both@example.com");
  });

  it("rejects registration without any contact method", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ password: "TestPass1!", password_confirm: "TestPass1!" });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("rejects duplicate phone numbers", async () => {
    // First registration succeeds.
    await request(app).post("/api/auth/register").send({
      phone_number: "+2348031111003",
      password: "TestPass1!",
      password_confirm: "TestPass1!",
    });
    // Second with same phone fails.
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        phone_number: "+2348031111003",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects duplicate email addresses", async () => {
    await request(app).post("/api/auth/register").send({
      email: "dupemail@example.com",
      password: "TestPass1!",
      password_confirm: "TestPass1!",
    });
    const res = await request(app).post("/api/auth/register").send({
      email: "dupemail@example.com",
      password: "TestPass1!",
      password_confirm: "TestPass1!",
    });

    expect(res.status).toBe(409);
  });

  it("normalizes phone numbers to E.164", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        phone_number: "08031111004",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.phone_number).toBe("+2348031111004");
  });

  it("normalizes email to lowercase", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "UPPERCASE@EXAMPLE.COM",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("uppercase@example.com");
  });

  it("rejects mismatched passwords", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "mismatch@example.com",
        password: "TestPass1!",
        password_confirm: "DifferentPass1!",
      });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e: { field: string }) => e.field === "password_confirm")).toBe(true);
  });

  it("rejects short passwords", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "short@example.com",
        password: "abc",
        password_confirm: "abc",
      });

    expect(res.status).toBe(422);
  });
});

// ─── Phone OTP verification ───────────────────────────────────────────────────

describe("POST /api/auth/verify-phone", () => {
  it("rejects an invalid OTP", async () => {
    // Use a unique phone to avoid conflicts with other tests.
    const { User } = await import("../src/database/models/index.js");
    await User.destroy({ where: { phone_number: "+2348031222001" }, force: true });

    const reg = await request(app).post("/api/auth/register").send({
      phone_number: "+2348031222001",
      password: "TestPass1!",
      password_confirm: "TestPass1!",
    });
    expect(reg.status).toBe(201);
    const userId = reg.body.data.user.id;

    const res = await request(app)
      .post("/api/auth/verify-phone")
      .send({ user_id: userId, otp: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects an OTP with a bad format", async () => {
    const res = await request(app)
      .post("/api/auth/verify-phone")
      .send({ user_id: "00000000-0000-0000-0000-000000000000", otp: "abc" });

    expect(res.status).toBe(422);
  });

  it("rejects when user_id is missing", async () => {
    const res = await request(app)
      .post("/api/auth/verify-phone")
      .send({ otp: "123456" });

    expect(res.status).toBe(422);
  });
});

// ─── Email verification ───────────────────────────────────────────────────────

describe("POST /api/auth/verify-email", () => {
  it("rejects an invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "invalid-token-that-does-not-exist" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a missing token", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({});

    expect(res.status).toBe(422);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  // Use a unique phone per test run to avoid conflicts.
  const loginPhone = "+2348099000001";

  beforeEach(async () => {
    const { User, PhoneOtp } = await import("../src/database/models/index.js");
    const { hashOtp } = await import("../src/services/otp.service.js");

    // Remove any leftover record for this phone.
    await User.destroy({ where: { phone_number: loginPhone }, force: true });

    // Register fresh.
    const reg = await request(app).post("/api/auth/register").send({
      phone_number: loginPhone,
      password: "LoginPass1!",
      password_confirm: "LoginPass1!",
    });
    expect(reg.status).toBe(201);
    const userId = reg.body.data.user.id as string;

    // Overwrite the OTP hash with a known value so we can verify it.
    const knownOtp = "777777";
    const otpHash = hashOtp(knownOtp);
    await PhoneOtp.update(
      { otp_hash: otpHash },
      { where: { user_id: userId, used: false } },
    );

    // Verify phone — this marks the user active.
    const verifyRes = await request(app)
      .post("/api/auth/verify-phone")
      .send({ user_id: userId, otp: knownOtp });
    expect(verifyRes.status).toBe(200);
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: loginPhone, password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects login with an unverified contact", async () => {
    // Register a new user but do NOT verify.
    const unverifiedPhone = "+2348099000002";
    const { User } = await import("../src/database/models/index.js");
    await User.destroy({ where: { phone_number: unverifiedPhone }, force: true });

    await request(app).post("/api/auth/register").send({
      phone_number: unverifiedPhone,
      password: "LoginPass1!",
      password_confirm: "LoginPass1!",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: unverifiedPhone, password: "LoginPass1!" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/not verified/i);
  });

  it("rejects login with invalid identifier format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "", password: "LoginPass1!" });

    expect(res.status).toBe(422);
  });

  it("logs in successfully with verified phone", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: loginPhone, password: "LoginPass1!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access_token).toBeTruthy();
    expect(res.body.data.user.phone_verified).toBe(true);
    // Refresh token should be in an HttpOnly cookie, not the body.
    expect(JSON.stringify(res.body.data)).not.toContain("refresh_token");
    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    expect(setCookie?.some((c: string) => c.startsWith("refresh_token="))).toBe(true);
  });
});

// ─── Token and session management ─────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.jwt.token");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("succeeds even without a refresh token cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Authorization middleware ─────────────────────────────────────────────────

describe("Authentication middleware", () => {
  it("rejects unauthenticated requests to protected routes", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects expired/invalid tokens", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.e30.INVALID");
    expect(res.status).toBe(401);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe("POST /api/auth/resend-phone-otp", () => {
  it("returns 404 for unknown user", async () => {
    const res = await request(app)
      .post("/api/auth/resend-phone-otp")
      .send({ user_id: "00000000-0000-0000-0000-000000000001" });
    // 404 because the user doesn't exist.
    expect(res.status).toBe(404);
  });

  it("rejects invalid user_id format", async () => {
    const res = await request(app)
      .post("/api/auth/resend-phone-otp")
      .send({ user_id: "not-a-uuid" });
    expect(res.status).toBe(422);
  });
});
