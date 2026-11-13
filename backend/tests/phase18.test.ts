/**
 * Phase 18 — controlled pilot readiness, participants, feedback and metrics.
 *
 * These tests exercise the API and database only. They do not contact Paystack,
 * Africa's Talking, Brevo or any real phone number.
 */

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  PilotConfiguration,
  PilotFeedback,
  PilotParticipant,
  PhoneOtp,
  Role,
  UserRole,
} from "../src/database/models/index.js";
import { hashOtp } from "../src/services/otp.service.js";
import { READINESS_MODULES } from "../src/modules/pilot/pilot.readiness.catalog.js";

interface AuthUser {
  userId: string;
  token: string;
  phone: string;
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234814${String(phoneCounter).padStart(8, "0")}`;
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
    { otp_hash: hashOtp("181818") },
    { where: { user_id: userId, used: false } },
  );
  expect(
    (await request(app)
      .post("/api/auth/verify-phone")
      .send({ user_id: userId, otp: "181818" })).status,
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

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

let farmer: AuthUser;
let buyer: AuthUser;
let outsider: AuthUser;
let admin: AuthUser;
let configurationId: string;
let farmerParticipantId: string;
let feedbackId: string;

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();

  farmer = await registerAndLogin();
  buyer = await registerAndLogin();
  outsider = await registerAndLogin();
  admin = await registerAndLogin();

  await removeRole(buyer.userId, "farmer");
  await addRole(buyer.userId, "buyer");
  await addRole(admin.userId, "admin");
}, 1_800_000);

describe("Phase 18 readiness catalogue", () => {
  it("defines 20 unique evidence-backed modules", () => {
    expect(READINESS_MODULES).toHaveLength(20);
    const keys = READINESS_MODULES.map((module) => module.key);
    expect(new Set(keys).size).toBe(20);
    for (const module of READINESS_MODULES) {
      expect(module.evidence.length).toBeGreaterThan(0);
    }
  });
});

describe("Phase 18 pilot configuration", () => {
  it("rejects an end date before the start date", async () => {
    const res = await request(app)
      .post("/api/admin/pilot/configurations")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Invalid Pilot",
        start_date: "2026-12-31",
        end_date: "2026-01-01",
      });
    expect(res.status).toBe(422);
  });

  it("creates an active pilot configuration", async () => {
    const res = await request(app)
      .post("/api/admin/pilot/configurations")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Plateau Controlled Pilot",
        country: "Nigeria",
        state_or_region: "Plateau",
        locations: ["Jos North", "Bokkos", "Riyom"],
        start_date: dateOffset(-30),
        end_date: dateOffset(30),
        is_active: true,
        notes: "Phase 18 controlled pilot.",
      });
    expect(res.status).toBe(201);
    configurationId = res.body.data.configuration.id as string;
    expect(res.body.data.configuration.status).toBe("active");
    expect(res.body.data.configuration.is_active).toBe(true);
  });

  it("keeps only one active configuration", async () => {
    const res = await request(app)
      .post("/api/admin/pilot/configurations")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Second Active Pilot", is_active: true });
    expect(res.status).toBe(201);

    const first = await PilotConfiguration.findByPk(configurationId);
    expect(first!.is_active).toBe(false);

    const reactivated = await request(app)
      .patch(`/api/admin/pilot/configurations/${configurationId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ is_active: true });
    expect(reactivated.status).toBe(200);

    const active = await PilotConfiguration.count({
      where: { is_active: true },
    });
    expect(active).toBe(1);
  });

  it("returns an evidence-based readiness report", async () => {
    const res = await request(app)
      .get("/api/admin/pilot/readiness")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.modules).toHaveLength(20);
    expect(res.body.data.launch_recommendation).toBe(
      "INTERNAL_TESTING_READY",
    );
    expect(res.body.data.summary.critical_modules).toBeGreaterThan(0);

    const payments = res.body.data.modules.find(
      (module: { key: string }) => module.key === "paystack_payments",
    );
    expect(payments.pilot_readiness).toBe("sandbox_tested_only");
    expect(payments.runtime_notes.join(" ")).toContain("test mode");
  });

  it("records an explicit admin readiness override with evidence", async () => {
    const res = await request(app)
      .patch(
        `/api/admin/pilot/configurations/${configurationId}/readiness/paystack_payments`,
      )
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        testing_status: "passed",
        integration_status: "sandbox_only",
        pilot_readiness: "sandbox_tested_only",
        evidence: ["Manual Paystack test-mode run recorded 2026-11-17"],
        notes: "Sandbox only. Live approval still outstanding.",
      });
    expect(res.status).toBe(200);
    const payments = res.body.data.modules.find(
      (module: { key: string }) => module.key === "paystack_payments",
    );
    expect(payments.source).toBe("admin_review");
    expect(payments.testing_status).toBe("passed");
    expect(payments.override.reviewed_by_user_id).toBe(admin.userId);
  });
});

describe("Phase 18 pilot participants and consent", () => {
  it("requires recorded consent before approval", async () => {
    const res = await request(app)
      .post(`/api/admin/pilot/configurations/${configurationId}/participants`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        user_id: farmer.userId,
        participant_type: "farmer",
        status: "approved",
        consent_confirmed: false,
      });
    expect(res.status).toBe(201);
    farmerParticipantId = res.body.data.participant.id as string;
    expect(res.body.data.participant.status).toBe("pending_consent");
  });

  it("records consent and approves a participant", async () => {
    const res = await request(app)
      .patch(
        `/api/admin/pilot/configurations/${configurationId}/participants/${farmerParticipantId}`,
      )
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "active", consent_confirmed: true });
    expect(res.status).toBe(200);
    expect(res.body.data.participant.status).toBe("active");
    expect(res.body.data.participant.consent_given_at).not.toBeNull();
    expect(res.body.data.participant.consent_version).toBe(
      "pilot-consent-v1",
    );
  });

  it("adds a consented buyer participant", async () => {
    const res = await request(app)
      .post(`/api/admin/pilot/configurations/${configurationId}/participants`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        user_id: buyer.userId,
        participant_type: "buyer",
        status: "approved",
        consent_confirmed: true,
        consent_version: "pilot-consent-v1",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.participant.status).toBe("approved");
  });

  it("rejects duplicate participation", async () => {
    const res = await request(app)
      .post(`/api/admin/pilot/configurations/${configurationId}/participants`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        user_id: farmer.userId,
        participant_type: "farmer",
        consent_confirmed: true,
      });
    expect(res.status).toBe(409);
  });

  it("shows participation only to approved participants", async () => {
    const mine = await request(app)
      .get("/api/pilot/me")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.participant.id).toBe(farmerParticipantId);

    const denied = await request(app)
      .get("/api/pilot/me")
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(denied.status).toBe(403);
  });

  it("lists participants for administrators", async () => {
    const res = await request(app)
      .get(`/api/admin/pilot/configurations/${configurationId}/participants`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(await PilotParticipant.count()).toBe(2);
  });
});

describe("Phase 18 pilot feedback", () => {
  it("validates feedback input", async () => {
    const res = await request(app)
      .post("/api/pilot/feedback")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ category: "general", description: "short" });
    expect(res.status).toBe(422);
  });

  it("accepts feedback from an approved participant", async () => {
    const res = await request(app)
      .post("/api/pilot/feedback")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        category: "listing",
        description: "Publishing a listing failed once on a slow connection.",
        severity: "high",
      });
    expect(res.status).toBe(201);
    feedbackId = res.body.data.feedback.id as string;
    expect(res.body.data.feedback.feedback_number).toMatch(/^PF-/);
    expect(res.body.data.feedback.participant_type).toBe("farmer");
  });

  it("prevents participants from reading each other's feedback", async () => {
    const res = await request(app)
      .get(`/api/pilot/feedback/${feedbackId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(404);
  });

  it("lets administrators triage and resolve feedback", async () => {
    const list = await request(app)
      .get("/api/admin/pilot/feedback")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const updated = await request(app)
      .patch(`/api/admin/pilot/feedback/${feedbackId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        status: "resolved",
        assigned_admin_user_id: admin.userId,
        resolution_notes: "Followed up with the farmer; retry succeeded.",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.feedback.status).toBe("resolved");
    expect(updated.body.data.feedback.resolved_at).not.toBeNull();

    const row = await PilotFeedback.findByPk(feedbackId);
    expect(row!.status).toBe("resolved");
  });

  it("blocks feedback from non-participants", async () => {
    const res = await request(app)
      .post("/api/pilot/feedback")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({
        category: "general",
        description: "This account is not part of the pilot.",
      });
    expect(res.status).toBe(403);
  });
});

describe("Phase 18 pilot metrics", () => {
  it("returns pilot participation and marketplace metrics", async () => {
    const res = await request(app)
      .get(`/api/admin/pilot/configurations/${configurationId}/metrics`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pilot_configuration_id).toBe(configurationId);
    expect(res.body.data.window.timezone).toBe("Africa/Lagos");
    expect(res.body.data.participation.active).toBe(1);
    expect(res.body.data.participation.approved).toBe(1);
    expect(res.body.data.accessibility.pilot_feedback_received).toBe(1);
    expect(res.body.data.marketplace.payment_success_rate).toBe(0);
  });

  it("requires admin access for metrics", async () => {
    const res = await request(app)
      .get(`/api/admin/pilot/configurations/${configurationId}/metrics`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(res.status).toBe(403);
  });
});
