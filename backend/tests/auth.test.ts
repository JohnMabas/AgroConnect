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
import { setEmailProvider } from "../src/integrations/email/index.js";
import { setSmsProvider } from "../src/integrations/sms/index.js";

// ─── Test helpers ─────────────────────────────────────────────────────────────

interface SentEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const sentEmails: SentEmail[] = [];
const sentSms: Array<{ to: string; body: string }> = [];
let failNextEmail = false;

const mockEmailProvider = {
  async sendEmail(message: SentEmail): Promise<void> {
    if (failNextEmail) {
      failNextEmail = false;
      throw new Error("Simulated email delivery failure.");
    }
    sentEmails.push(message);
    await Promise.resolve();
  },
};

function latestEmailTo(address: string): SentEmail | undefined {
  return [...sentEmails].reverse().find((email) => email.to === address);
}

function extractVerificationCode(text: string): string {
  const match = text.match(/\b(\d{6})\b/);
  if (!match || !match[1]) {
    throw new Error("Verification code not found in email body.");
  }
  return match[1];
}

beforeAll(async () => {
  // Reset schema and run all migrations + role seeder.
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
  setEmailProvider(mockEmailProvider);
  setSmsProvider({
    async sendSms(message) {
      sentSms.push(message);
    },
  });
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

  it("assigns the requested self-registration role", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "buyer-role@example.com",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
        role: "buyer",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.roles).toEqual(["buyer"]);
  });

  it("rejects privileged roles during self-registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "admin-role@example.com",
        password: "TestPass1!",
        password_confirm: "TestPass1!",
        role: "admin",
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

// ─── Email OTP verification ──────────────────────────────────────────────────

describe("Email OTP verification", () => {
  const password = "TestPass1!";

  async function registerEmail(email: string) {
    const res = await request(app).post("/api/auth/register").send({
      email,
      password,
      password_confirm: password,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.email_verification_pending).toBe(true);

    const message = latestEmailTo(email);
    expect(message).toBeDefined();
    expect(message!.subject).toBe("Your AgroConnect Verification Code");

    return {
      userId: res.body.data.user.id as string,
      code: extractVerificationCode(message!.text),
      message: message!,
    };
  }

  it("sends a 6-digit code and verifies the email address", async () => {
    const email = "otp-success@example.com";
    const { userId, code, message } = await registerEmail(email);

    expect(code).toMatch(/^\d{6}$/);
    expect(message.text).toContain("Your AgroConnect Verification Code");
    expect(message.text).toContain("This code expires in 15 minutes.");
    // No long-lived raw token or token URL is included in the email.
    expect(message.text).not.toMatch(/[a-f0-9]{64}/i);
    expect(message.text).not.toContain("/verify-email?token=");
    expect(message.html).not.toContain("/verify-email?token=");

    const invalidFormat = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: "12345" });
    expect(invalidFormat.status).toBe(422);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email, otp: code });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email_verified).toBe(true);
    expect(res.body.data.user.status).toBe("active");

    // The verified email can now be used to log in.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ identifier: email, password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.email_verified).toBe(true);

    // The same code cannot be replayed.
    const replay = await request(app)
      .post("/api/auth/verify-email")
      .send({ email, otp: code });
    expect(replay.status).toBe(400);
    expect(replay.body.error.message).toMatch(/already been used/i);
  });

  it("verifies using the secure user reference", async () => {
    const email = "otp-user-id@example.com";
    const { userId, code } = await registerEmail(email);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: code });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email_verified).toBe(true);
  });

  it("rejects an incorrect code without marking the email verified", async () => {
    const email = "otp-wrong@example.com";
    const { userId, code } = await registerEmail(email);
    const wrongCode = code === "000000" ? "111111" : "000000";

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: wrongCode });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/incorrect/i);

    const { EmailVerificationToken, User } = await import(
      "../src/database/models/index.js"
    );
    const record = await EmailVerificationToken.findOne({
      where: { user_id: userId },
    });
    expect(record?.used).toBe(false);
    const user = await User.findByPk(userId);
    expect(user?.status).toBe("pending");
  });

  it("rejects an expired code", async () => {
    const email = "otp-expired@example.com";
    const { userId, code } = await registerEmail(email);

    const { EmailVerificationToken } = await import(
      "../src/database/models/index.js"
    );
    await EmailVerificationToken.update(
      { expires_at: new Date(Date.now() - 60_000) },
      { where: { user_id: userId } },
    );

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: code });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/expired/i);
  });

  it("enforces the maximum number of verification attempts", async () => {
    const email = "otp-max-attempts@example.com";
    const { userId, code } = await registerEmail(email);

    const { EmailVerificationToken } = await import(
      "../src/database/models/index.js"
    );
    const { env } = await import("../src/config/env.js");
    await EmailVerificationToken.update(
      { attempts: env.EMAIL_VERIFICATION_MAX_ATTEMPTS },
      { where: { user_id: userId } },
    );

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: code });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/too many/i);
  });

  it("enforces the resend cooldown", async () => {
    const email = "otp-cooldown@example.com";
    const { userId } = await registerEmail(email);

    const res = await request(app)
      .post("/api/auth/resend-email-verification")
      .send({ user_id: userId });

    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
    expect(latestEmailTo(email)?.subject).toBe(
      "Your AgroConnect Verification Code",
    );
  });

  it("invalidates the previous code when a new code is issued", async () => {
    const email = "otp-resend@example.com";
    const { userId, code: oldCode } = await registerEmail(email);

    const { EmailVerificationToken } = await import(
      "../src/database/models/index.js"
    );
    const { env } = await import("../src/config/env.js");
    await EmailVerificationToken.update(
      {
        created_at: new Date(
          Date.now() - (env.OTP_RESEND_COOLDOWN_SECONDS + 5) * 1000,
        ),
      },
      { where: { user_id: userId } },
    );

    const resend = await request(app)
      .post("/api/auth/resend-email-verification")
      .send({ email });
    expect(resend.status).toBe(200);
    expect(resend.body.data.retry_after_seconds).toBe(
      env.OTP_RESEND_COOLDOWN_SECONDS,
    );

    const newCode = extractVerificationCode(latestEmailTo(email)!.text);
    expect(newCode).not.toBe(oldCode);
    expect(
      await EmailVerificationToken.count({
        where: { user_id: userId, used: false },
      }),
    ).toBe(1);

    const oldAttempt = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: oldCode });
    expect(oldAttempt.status).toBe(400);

    const newAttempt = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: newCode });
    expect(newAttempt.status).toBe(200);
  });

  it("does not mark the email verified when delivery fails", async () => {
    const email = "otp-delivery-failure@example.com";
    failNextEmail = true;

    const res = await request(app).post("/api/auth/register").send({
      email,
      password: "TestPass1!",
      password_confirm: "TestPass1!",
    });

    expect(res.status).toBe(201);
    const userId = res.body.data.user.id as string;

    const { EmailVerificationToken, User } = await import(
      "../src/database/models/index.js"
    );
    expect(
      await EmailVerificationToken.count({ where: { user_id: userId } }),
    ).toBe(0);

    const verify = await request(app)
      .post("/api/auth/verify-email")
      .send({ user_id: userId, otp: "123456" });
    expect(verify.status).toBe(400);

    const user = await User.findByPk(userId);
    expect(user?.status).toBe("pending");
  });
});

// ─── Password reset ───────────────────────────────────────────────────────────

describe("POST /api/auth/forgot-password and /reset-password", () => {
  const password = "TestPass1!";

  async function registerAndVerifyEmail(email: string): Promise<string> {
    const register = await request(app).post("/api/auth/register").send({
      email,
      password,
      password_confirm: password,
    });
    expect(register.status).toBe(201);

    const verificationEmail = latestEmailTo(email);
    expect(verificationEmail).toBeDefined();
    const verificationCode = extractVerificationCode(verificationEmail!.text);

    const verify = await request(app)
      .post("/api/auth/verify-email")
      .send({ email, otp: verificationCode });
    expect(verify.status).toBe(200);
    return register.body.data.user.id as string;
  }

  it("returns a generic response for unknown accounts", async () => {
    const unknown = "password-reset-unknown@example.com";
    const before = sentEmails.length;

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ identifier: unknown });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/if an account exists/i);
    expect(sentEmails.length).toBe(before);
  });

  it("emails a code, resets the password, and invalidates the old password", async () => {
    const email = "password-reset-email@example.com";
    await registerAndVerifyEmail(email);

    const forgot = await request(app)
      .post("/api/auth/forgot-password")
      .send({ identifier: email });
    expect(forgot.status).toBe(200);

    const resetEmail = latestEmailTo(email);
    expect(resetEmail).toBeDefined();
    expect(resetEmail!.subject).toBe("Reset your AgroConnect password");
    const code = extractVerificationCode(resetEmail!.text);
    expect(code).toMatch(/^\d{6}$/);

    const briefDelay = await request(app)
      .post("/api/auth/forgot-password")
      .send({ identifier: email });
    expect(briefDelay.status).toBe(200);
    expect(latestEmailTo(email)!.text).toBe(resetEmail!.text);

    const wrongCode = code === "000000" ? "111111" : "000000";
    const wrong = await request(app)
      .post("/api/auth/reset-password")
      .send({
        identifier: email,
        code: wrongCode,
        password: "NewPass1!",
        password_confirm: "NewPass1!",
      });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.message).toMatch(/incorrect/i);

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({
        identifier: email,
        code,
        password: "NewPass1!",
        password_confirm: "NewPass1!",
      });
    expect(reset.status).toBe(200);
    expect(reset.body.success).toBe(true);

    const replay = await request(app)
      .post("/api/auth/reset-password")
      .send({
        identifier: email,
        code,
        password: "AnotherPass1!",
        password_confirm: "AnotherPass1!",
      });
    expect(replay.status).toBe(400);

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ identifier: email, password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ identifier: email, password: "NewPass1!" });
    expect(newLogin.status).toBe(200);
  });

  it("resets a phone-registered account using an SMS code", async () => {
    const phone = "+2348099111001";
    const register = await request(app).post("/api/auth/register").send({
      phone_number: phone,
      password,
      password_confirm: password,
    });
    expect(register.status).toBe(201);
    const userId = register.body.data.user.id as string;

    const registrationSms = [...sentSms].reverse().find((sms) => sms.to === phone);
    expect(registrationSms).toBeDefined();
    const verifyCode = extractVerificationCode(registrationSms!.body);

    const verify = await request(app)
      .post("/api/auth/verify-phone")
      .send({ user_id: userId, otp: verifyCode });
    expect(verify.status).toBe(200);

    const forgot = await request(app)
      .post("/api/auth/forgot-password")
      .send({ identifier: phone });
    expect(forgot.status).toBe(200);

    const resetSms = [...sentSms]
      .reverse()
      .find((sms) => sms.to === phone && /password reset code/i.test(sms.body));
    expect(resetSms).toBeDefined();
    const code = extractVerificationCode(resetSms!.body);

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({
        identifier: phone,
        code,
        password: "PhonePass1!",
        password_confirm: "PhonePass1!",
      });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ identifier: phone, password: "PhonePass1!" });
    expect(login.status).toBe(200);
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
