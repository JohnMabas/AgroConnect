/**
 * Phase 16 — cooperative-only agents, farmer consent, approvals, audit,
 * complaints/evidence and payment transparency.
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
  AgentActivityLog,
  CooperativeProfile,
  FarmerAgentRelationship,
  FarmerConsentRecord,
  PhoneOtp,
  ProduceType,
  Role,
  UserRole,
} from "../src/database/models/index.js";

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
  return `+234812${String(phoneCounter).padStart(8, "0")}`;
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
    email: `phase16-${phoneCounter}@example.com`,
    password,
    password_confirm: password,
  });
  expect(reg.status, `register ${phone}`).toBe(201);
  const userId = reg.body.data.user.id as string;

  const { hashOtp } = await import("../src/services/otp.service.js");
  await PhoneOtp.update(
    { otp_hash: hashOtp("161616") },
    { where: { user_id: userId, used: false } },
  );
  expect(
    (await request(app)
      .post("/api/auth/verify-phone")
      .send({ user_id: userId, otp: "161616" })).status,
  ).toBe(200);

  const login = await request(app).post("/api/auth/login").send({
    identifier: phone,
    password,
  });
  expect(login.status, `login ${phone}`).toBe(200);
  return { userId, token: login.body.data.access_token as string, phone };
}

async function login(user: AuthUser): Promise<string> {
  const response = await request(app).post("/api/auth/login").send({
    identifier: user.phone,
    password: "TestPass1!",
  });
  expect(response.status).toBe(200);
  return response.body.data.access_token as string;
}

async function grantRole(userId: string, roleName: string): Promise<void> {
  const role = await Role.findOne({ where: { name: roleName } });
  expect(role, `role ${roleName}`).not.toBeNull();
  await UserRole.findOrCreate({
    where: { user_id: userId, role_id: role!.id },
    defaults: { user_id: userId, role_id: role!.id },
  });
}

let farmer: AuthUser;
let buyer: AuthUser;
let agent: AuthUser;
let otherFarmer: AuthUser;
let cooperativeOwner: AuthUser;
let admin: AuthUser;
let cooperativeId: string;
let agentProfileId: string;
let relationshipId: string;
let listingId: string;
let orderId: string;
let complaintId: string;
let evidenceId: string;

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();

  farmer = await registerAndLogin();
  buyer = await registerAndLogin();
  agent = await registerAndLogin();
  otherFarmer = await registerAndLogin();
  cooperativeOwner = await registerAndLogin();
  admin = await registerAndLogin();

  await grantRole(admin.userId, "admin");
  await grantRole(cooperativeOwner.userId, "cooperative");
  admin.token = await login(admin);
  cooperativeOwner.token = await login(cooperativeOwner);

  const profile = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${farmer.token}`)
    .send({
      farm_name: `Phase 16 Farm ${farmer.phone}`,
      farming_experience_years: 6,
    });
  expect(profile.status).toBe(201);

  const cooperative = await request(app)
    .post("/api/cooperatives")
    .set("Authorization", `Bearer ${cooperativeOwner.token}`)
    .send({
      cooperative_name: `Phase 16 Cooperative ${cooperativeOwner.phone}`,
      country: "Nigeria",
      state_or_region: "Plateau",
      contact_person_name: "Cooperative Lead",
      date_of_registration: "2020-01-15",
    });
  expect(cooperative.status).toBe(201);
  cooperativeId = cooperative.body.data.cooperative.id as string;

  expect(
    (await request(app)
      .patch(`/api/cooperatives/admin/${cooperativeId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ notes: "Verified cooperative records." })).status,
  ).toBe(200);

  const type = await ProduceType.findOne({ order: [["name", "ASC"]] });
  expect(type).not.toBeNull();
  const listing = await request(app)
    .post("/api/listings")
    .set("Authorization", `Bearer ${farmer.token}`)
    .send({
      produce_type_id: type!.id,
      title: "Phase 16 Consent Maize",
      quantity: 300,
      unit: "kg",
      price_per_unit: 350,
      currency: "NGN",
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      community: "Bukuru",
      expiry_date: dateOffset(30),
    });
  expect(listing.status).toBe(201);
  listingId = listing.body.data.listing.id as string;
  expect(
    (await request(app)
      .patch(`/api/listings/${listingId}/publish`)
      .set("Authorization", `Bearer ${farmer.token}`)).status,
  ).toBe(200);
}, 600_000);

describe("Phase 16 farmer protection", () => {
  it("protects administration endpoints", async () => {
    expect(
      (await request(app).get("/api/admin/farmer-protection/agents")).status,
    ).toBe(401);
    expect(
      (await request(app)
        .get("/api/admin/farmer-protection/agents")
        .set("Authorization", `Bearer ${farmer.token}`)).status,
    ).toBe(403);
  });

  it("requires cooperative invitation and admin verification before agent activation", async () => {
    const invite = await request(app)
      .post(`/api/cooperatives/${cooperativeId}/agents/invite`)
      .set("Authorization", `Bearer ${cooperativeOwner.token}`)
      .send({
        user_id: agent.userId,
        full_name: "Phase 16 Agent",
        phone_number: agent.phone,
        operating_area: "Jos North",
        appointment_date: "2026-01-10",
        code_of_conduct_version: "2026.1",
      });
    expect(invite.status).toBe(201);
    agentProfileId = invite.body.data.agent.id as string;
    expect(invite.body.data.agent.verification_status).toBe("pending");

    expect(
      (await request(app)
        .post(`/api/cooperatives/${cooperativeId}/agents/invite`)
        .set("Authorization", `Bearer ${cooperativeOwner.token}`)
        .send({
          user_id: agent.userId,
          full_name: "Duplicate Agent",
          phone_number: agent.phone,
        })).status,
    ).toBe(409);

    const verified = await request(app)
      .post(`/api/admin/farmer-protection/agents/${agentProfileId}/verify`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved", notes: "Identity and conduct verified." });
    expect(verified.status).toBe(200);
    expect(verified.body.data.agent.status).toBe("active");
    expect(verified.body.data.agent.verification_status).toBe("approved");

    agent.token = await login(agent);
  });

  it("requires explicit farmer consent before an agent relationship becomes active", async () => {
    const requested = await request(app)
      .post("/api/agents/relationships")
      .set("Authorization", `Bearer ${agent.token}`)
      .send({
        farmer_user_id: farmer.userId,
        cooperative_id: cooperativeId,
        permissions: ["manage_listings", "coordinate_orders"],
      });
    expect(requested.status).toBe(201);
    relationshipId = requested.body.data.relationship.id as string;
    expect(requested.body.data.relationship.status).toBe("pending");

    const pending = await request(app)
      .get("/api/farmers/me/agent-relationships")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(pending.status).toBe(200);
    expect(pending.body.data.relationships[0].status).toBe("pending");

    const granted = await request(app)
      .post(`/api/farmers/me/agent-relationships/${relationshipId}/consent`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        permissions: ["manage_listings", "coordinate_orders"],
        method: "in_app",
      });
    expect(granted.status).toBe(200);
    expect(granted.body.data.relationship.status).toBe("active");
    expect(
      granted.body.data.relationship.permissions.filter(
        (permission: { is_granted: boolean }) => permission.is_granted,
      ),
    ).toHaveLength(2);

    const consent = await request(app)
      .get("/api/farmers/me/consent-records")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(consent.status).toBe(200);
    expect(consent.body.data.consent_records[0].action).toBe("consent_granted");

    expect(
      (await request(app)
        .post(`/api/farmers/me/agent-relationships/${relationshipId}/consent`)
        .set("Authorization", `Bearer ${otherFarmer.token}`)
        .send({ permissions: ["manage_listings"] })).status,
    ).toBe(404);
  });

  it("applies agent actions only after farmer approval and keeps requests idempotent", async () => {
    const body = {
      farmer_user_id: farmer.userId,
      cooperative_id: cooperativeId,
      relationship_id: relationshipId,
      action_type: "listing_price_change",
      resource_type: "produce_listing",
      resource_id: listingId,
      proposed_values: { price_per_unit: 375 },
      expires_in_minutes: 60,
      idempotency_key: "phase16-price-approval-0001",
    };
    const requested = await request(app)
      .post("/api/agents/approvals")
      .set("Authorization", `Bearer ${agent.token}`)
      .send(body);
    expect(requested.status).toBe(201);
    const approvalId = requested.body.data.approval.id as string;
    expect(requested.body.data.approval.approval_status).toBe("pending");

    const repeated = await request(app)
      .post("/api/agents/approvals")
      .set("Authorization", `Bearer ${agent.token}`)
      .send(body);
    expect(repeated.status).toBe(201);
    expect(repeated.body.data.approval.id).toBe(approvalId);

    const before = await request(app)
      .get(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(Number(before.body.data.listing.price_per_unit)).toBe(350);

    const approved = await request(app)
      .post(`/api/farmers/me/approvals/${approvalId}/approve`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ note: "Approved price adjustment." });
    expect(approved.status).toBe(200);
    expect(approved.body.data.approval.approval_status).toBe("approved");
    expect(approved.body.data.approval.applied_at).not.toBeNull();

    const after = await request(app)
      .get(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(Number(after.body.data.listing.price_per_unit)).toBe(375);
  });

  it("rejects unsupported payment destination changes", async () => {
    const response = await request(app)
      .post("/api/agents/approvals")
      .set("Authorization", `Bearer ${agent.token}`)
      .send({
        farmer_user_id: farmer.userId,
        cooperative_id: cooperativeId,
        relationship_id: relationshipId,
        action_type: "payment_destination_change",
        resource_type: "order",
        resource_id: listingId,
        proposed_values: { account_number: "0000000000" },
        idempotency_key: "phase16-payment-destination-0001",
      });
    expect(response.status).toBe(422);
  });

  it("creates transparent fee disclosures only after farmer approval", async () => {
    const offer = await request(app)
      .post("/api/offers")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        listing_id: listingId,
        quantity: 20,
        unit: "kg",
        unit_price: 375,
        currency: "NGN",
        delivery_terms: "Delivered to the buyer market.",
        delivery_location: "Bukuru, Jos South",
        delivery_date: dateOffset(5),
        buyer_message: "Please confirm availability.",
        expires_at: dateOffset(3),
      });
    expect(offer.status).toBe(201);
    const offerId = offer.body.data.offer.id as string;
    expect(
      (await request(app)
        .post(`/api/offers/${offerId}/accept`)
        .set("Authorization", `Bearer ${farmer.token}`)).status,
    ).toBe(200);

    const order = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ offer_id: offerId });
    expect(order.status).toBe(201);
    orderId = order.body.data.order.id as string;

    const requested = await request(app)
      .post("/api/agents/approvals")
      .set("Authorization", `Bearer ${agent.token}`)
      .send({
        farmer_user_id: farmer.userId,
        cooperative_id: cooperativeId,
        relationship_id: relationshipId,
        action_type: "fee_disclosure",
        resource_type: "order",
        resource_id: orderId,
        proposed_values: {
          fee_type: "agent_service_fee",
          amount_minor: 2500,
          currency: "NGN",
          description: "Agreed agent coordination fee.",
        },
        idempotency_key: "phase16-fee-disclosure-0001",
      });
    expect(requested.status).toBe(201);
    const approvalId = requested.body.data.approval.id as string;

    expect(
      (await request(app)
        .post(`/api/farmers/me/approvals/${approvalId}/approve`)
        .set("Authorization", `Bearer ${farmer.token}`)
        .send({ note: "Fee accepted." })).status,
    ).toBe(200);

    const disclosures = await request(app)
      .get(`/api/orders/${orderId}/fee-disclosures`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(disclosures.status).toBe(200);
    expect(disclosures.body.data.fee_disclosures).toHaveLength(1);
    expect(disclosures.body.data.fee_disclosures[0].amount_minor).toBe("2500");
  });

  it("supports complaints, private evidence and append-only investigations", async () => {
    const complaint = await request(app)
      .post("/api/farmers/me/complaints")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        category: "unauthorized_transaction_change",
        description:
          "An agent attempted to change order terms without my approval.",
        agent_user_id: agent.userId,
        cooperative_id: cooperativeId,
        related_order_id: orderId,
        priority: "high",
      });
    expect(complaint.status).toBe(201);
    complaintId = complaint.body.data.complaint.id as string;

    const evidence = await request(app)
      .post(`/api/farmers/me/complaints/${complaintId}/evidence`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .field("description", "Order terms screenshot.")
      .attach("document", Buffer.from("%PDF-1.4\nPhase 16 evidence\n%%EOF"), {
        filename: "order-terms.pdf",
        contentType: "application/pdf",
      });
    expect(evidence.status).toBe(201);
    evidenceId = evidence.body.data.evidence.id as string;

    const download = await request(app)
      .get(
        `/api/farmers/me/complaints/${complaintId}/evidence/${evidenceId}/download`,
      )
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
    expect(download.body).toBeInstanceOf(Buffer);

    expect(
      (await request(app)
        .get(`/api/farmers/me/complaints/${complaintId}/evidence/${evidenceId}/download`)
        .set("Authorization", `Bearer ${otherFarmer.token}`)).status,
    ).toBe(404);

    const updated = await request(app)
      .patch(`/api/admin/farmer-protection/complaints/${complaintId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        status: "under_review",
        priority: "urgent",
        notes: "Complaint acknowledged and assigned.",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.complaint.status).toBe("under_review");

    const investigation = await request(app)
      .post(
        `/api/admin/farmer-protection/complaints/${complaintId}/investigations`,
      )
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        action: "contacted_parties",
        notes: "Requested statements from the farmer and agent.",
        decision: "pending",
      });
    expect(investigation.status).toBe(201);
    expect(
      investigation.body.data.complaint.investigations.length,
    ).toBeGreaterThanOrEqual(2);

    const consentRecord = await FarmerConsentRecord.findOne({
      where: { farmer_user_id: farmer.userId },
    });
    expect(consentRecord).not.toBeNull();
    await expect(
      consentRecord!.update({ action: "tampered" }),
    ).rejects.toThrow();

    const auditRecord = await AgentActivityLog.findOne({
      where: { farmer_user_id: farmer.userId },
    });
    expect(auditRecord).not.toBeNull();
    await expect(
      auditRecord!.update({ action_result: "tampered" }),
    ).rejects.toThrow();
  });

  it("exposes role-scoped audit trails and cooperative oversight", async () => {
    const farmerAudit = await request(app)
      .get("/api/farmers/me/audit")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(farmerAudit.status).toBe(200);
    expect(farmerAudit.body.data.total).toBeGreaterThan(0);

    const agentAudit = await request(app)
      .get("/api/agents/me/audit")
      .set("Authorization", `Bearer ${agent.token}`);
    expect(agentAudit.status).toBe(200);
    expect(agentAudit.body.data.total).toBeGreaterThan(0);

    const cooperativeAudit = await request(app)
      .get(`/api/cooperatives/${cooperativeId}/audit`)
      .set("Authorization", `Bearer ${cooperativeOwner.token}`);
    expect(cooperativeAudit.status).toBe(200);
    expect(cooperativeAudit.body.data.total).toBeGreaterThan(0);

    const adminAudit = await request(app)
      .get("/api/admin/farmer-protection/audit")
      .query({ cooperative_id: cooperativeId })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminAudit.status).toBe(200);
    expect(adminAudit.body.data.total).toBeGreaterThan(0);
  });

  it("suspends an agent and removes active relationship access", async () => {
    const suspended = await request(app)
      .post(`/api/admin/farmer-protection/agents/${agentProfileId}/suspend`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ reason: "Investigation pending." });
    expect(suspended.status).toBe(200);
    expect(suspended.body.data.agent.status).toBe("suspended");

    const relationship = await FarmerAgentRelationship.findByPk(relationshipId);
    expect(relationship?.status).toBe("suspended");

    const profile = await CooperativeProfile.findByPk(cooperativeId);
    expect(profile?.contact_person_name).toBe("Cooperative Lead");
  });
});
