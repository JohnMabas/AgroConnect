/**
 * Phase 12 — Ratings, reviews, moderation, verification and trust profiles.
 *
 * Covers transaction-eligible reviews, summaries, editing windows, reporting,
 * admin moderation, structured verification, private document storage,
 * notifications, profile consistency and public trust indicators.
 */

import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  Delivery,
  FarmerProfile,
  Notification,
  Order,
  PhoneOtp,
  Review,
  Role,
  User,
  UserRole,
  Verification,
  VerificationDocument,
} from "../src/database/models/index.js";
import { issuePhoneOtp } from "../src/services/otp.service.js";
import { setEmailProvider } from "../src/integrations/email/index.js";
import { setSmsProvider } from "../src/integrations/sms/index.js";

const emailSend = vi.fn(async () => ({ provider_reference: "phase12-email" }));
const smsSend = vi.fn(async () => ({ provider_reference: "phase12-sms" }));

beforeAll(async () => {
  setEmailProvider({ sendEmail: emailSend });
  setSmsProvider({ sendSms: smsSend });

  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
}, 600_000);

afterAll(async () => {
  await rm("private-uploads-test", { recursive: true, force: true });
});

interface AuthUser {
  userId: string;
  token: string;
  phone: string;
  email: string;
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234812${String(phoneCounter).padStart(8, "0")}`;
}

let emailCounter = 0;
function nextEmail(): string {
  emailCounter += 1;
  return `phase12-user-${emailCounter}@example.com`;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function registerAndLogin(
  phone = nextPhone(),
  email = nextEmail(),
): Promise<AuthUser> {
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
    email,
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

interface OrderPayload {
  id: string;
  status: string;
  payment_status: string;
  quantity: number;
  unit: string;
  delivery_location: string;
  delivery_date: string;
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
      title: "Phase 12 Review Maize",
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

async function createOrder(
  token: string,
  offerId: string,
): Promise<OrderPayload> {
  const response = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ offer_id: offerId });
  expect(response.status, "create order").toBe(201);
  return response.body.data.order as OrderPayload;
}

let farmer: AuthUser;
let buyer: AuthUser;
let transporter: AuthUser;
let outsider: AuthUser;
let admin: AuthUser;
let completedOrder: OrderPayload;
let unpaidOrder: OrderPayload;
let completedDeliveryId: string;
let farmerReviewId: string;

beforeAll(async () => {
  farmer = await registerAndLogin();
  buyer = await registerAndLogin();
  transporter = await registerAndLogin();
  outsider = await registerAndLogin();
  admin = await registerAndLogin();
  await grantRole(admin.userId, "admin");

  const profile = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${farmer.token}`)
    .send({
      farm_name: `Phase 12 Farm ${farmer.phone}`,
      farming_experience_years: 6,
    });
  expect(profile.status, "create farmer profile").toBe(201);

  const types = await request(app).get("/api/produce/types");
  expect(types.status).toBe(200);
  const produceTypeId = types.body.data.types[0].id as string;
  const listingId = await createPublishedListing(farmer.token, produceTypeId);

  const completedOfferId = await createAcceptedOffer(
    buyer.token,
    farmer.token,
    listingId,
    10,
  );
  completedOrder = await createOrder(buyer.token, completedOfferId);
  await Order.update(
    {
      status: "completed",
      payment_status: "paid",
      paid_at: new Date(),
      completed_at: new Date(),
    },
    { where: { id: completedOrder.id } },
  );

  const delivery = await Delivery.create({
    delivery_reference: `DLV-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${randomBytes(5).toString("hex").toUpperCase()}`,
    order_id: completedOrder.id,
    farmer_id: farmer.userId,
    buyer_id: buyer.userId,
    transporter_id: transporter.userId,
    pickup_location: "Bukuru Farm Gate, Jos South",
    delivery_location: completedOrder.delivery_location,
    produce_description: "Fresh maize in good condition",
    quantity: completedOrder.quantity,
    unit: completedOrder.unit,
    expected_pickup_date: dateOffset(-1),
    expected_delivery_date: dateOffset(-1),
    delivery_fee_minor: 125050,
    currency: "NGN",
    status: "completed",
    assigned_at: new Date(),
    accepted_at: new Date(),
    picked_up_at: new Date(),
    delivered_at: new Date(),
    completed_at: new Date(),
  });
  completedDeliveryId = delivery.id;

  const unpaidOfferId = await createAcceptedOffer(
    buyer.token,
    farmer.token,
    listingId,
    5,
  );
  unpaidOrder = await createOrder(buyer.token, unpaidOfferId);
}, 600_000);

describe("Phase 12 reviews", () => {
  it("rejects reviews before completion and from non-participants", async () => {
    const beforeCompletion = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ order_id: unpaidOrder.id, rating: 5, review_comment: "Too soon." });
    expect(beforeCompletion.status).toBe(422);

    const nonParticipant = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({
        order_id: completedOrder.id,
        rating: 5,
        review_comment: "Not my order.",
      });
    expect(nonParticipant.status).toBe(404);

    const nonParticipantDelivery = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({
        order_id: completedOrder.id,
        delivery_id: completedDeliveryId,
        rating: 5,
      });
    expect(nonParticipantDelivery.status).toBe(404);
  });

  it("creates order and transporter reviews with summaries and notifications", async () => {
    const orderReview = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        order_id: completedOrder.id,
        rating: 5,
        review_title: "Great maize",
        review_comment: "The produce arrived in excellent condition.",
      });
    expect(orderReview.status, "order review").toBe(201);
    farmerReviewId = orderReview.body.data.review.id as string;
    expect(orderReview.body.data.review).toMatchObject({
      reviewed_user_id: farmer.userId,
      reviewer_id: buyer.userId,
      order_id: completedOrder.id,
      delivery_id: null,
      rating: 5,
    });

    const deliveryReview = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        order_id: completedOrder.id,
        delivery_id: completedDeliveryId,
        rating: 4,
        review_comment: "Delivery was careful and on time.",
      });
    expect(deliveryReview.status, "delivery review").toBe(201);
    expect(deliveryReview.body.data.review.reviewed_user_id).toBe(
      transporter.userId,
    );

    const farmerOrderReview = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        order_id: completedOrder.id,
        rating: 4,
        review_comment: "Buyer communicated clearly.",
      });
    expect(farmerOrderReview.status, "farmer order review").toBe(201);

    const duplicate = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ order_id: completedOrder.id, rating: 3 });
    expect(duplicate.status).toBe(409);

    const selfReview = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        order_id: completedOrder.id,
        reviewed_user_id: buyer.userId,
        rating: 5,
      });
    expect(selfReview.status).toBe(422);

    const farmerReviews = await request(app).get(
      `/api/users/${farmer.userId}/reviews`,
    );
    expect(farmerReviews.status).toBe(200);
    expect(farmerReviews.body.data.total).toBe(1);

    const farmerSummary = await request(app).get(
      `/api/users/${farmer.userId}/reviews/summary`,
    );
    expect(farmerSummary.status).toBe(200);
    expect(farmerSummary.body.data.summary).toMatchObject({
      total_reviews: 1,
      average_rating: 5,
      five_star_reviews: 1,
      reviews_with_comments: 1,
    });

    const transporterSummary = await request(app).get(
      `/api/users/${transporter.userId}/reviews/summary`,
    );
    expect(transporterSummary.status).toBe(200);
    expect(transporterSummary.body.data.summary.average_rating).toBe(4);

    const notification = await Notification.findOne({
      where: {
        user_id: farmer.userId,
        notification_type: "new_review",
        related_entity_id: farmerReviewId,
      },
    });
    expect(notification).not.toBeNull();
    expect(notification!.title).toContain("review");
  });

  it("lets reviewers edit within the window, sanitizes content and audits changes", async () => {
    const updated = await request(app)
      .patch(`/api/reviews/${farmerReviewId}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        rating: 4,
        review_title: "<b>Updated</b> maize",
        review_comment: "<script>alert(1)</script> Good value.",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.review.review_title).toBe("Updated maize");
    expect(updated.body.data.review.review_comment).not.toContain("<script>");
    expect(updated.body.data.review.edited_at).not.toBeNull();

    const otherUser = await request(app)
      .patch(`/api/reviews/${farmerReviewId}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ rating: 1 });
    expect(otherUser.status).toBe(404);

    const history = await request(app)
      .get(`/api/admin/reviews/${farmerReviewId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(history.status).toBe(200);
    expect(
      history.body.data.history.some(
        (entry: { action: string }) => entry.action === "edited",
      ),
    ).toBe(true);

    await Review.update(
      { created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { where: { id: farmerReviewId }, silent: true },
    );

    const expiredEdit = await request(app)
      .patch(`/api/reviews/${farmerReviewId}`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ rating: 5 });
    expect(expiredEdit.status).toBe(422);
  });

  it("reports reviews, supports admin report moderation and hides/restores reviews", async () => {
    const report = await request(app)
      .post(`/api/reviews/${farmerReviewId}/report`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({
        reason: "spam",
        description: "This review looks promotional.",
      });
    expect(report.status).toBe(201);
    const reportId = report.body.data.report.id as string;

    const duplicate = await request(app)
      .post(`/api/reviews/${farmerReviewId}/report`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ reason: "spam" });
    expect(duplicate.status).toBe(409);

    const selfReport = await request(app)
      .post(`/api/reviews/${farmerReviewId}/report`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ reason: "other" });
    expect(selfReport.status).toBe(422);

    const adminNotification = await Notification.findOne({
      where: {
        user_id: admin.userId,
        notification_type: "review_reported",
        related_entity_id: reportId,
      },
    });
    expect(adminNotification).not.toBeNull();

    const reports = await request(app)
      .get("/api/admin/review-reports?status=pending")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(reports.status).toBe(200);
    expect(reports.body.data.total).toBe(1);

    const underReview = await request(app)
      .patch(`/api/admin/review-reports/${reportId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "under_review", resolution_note: "Investigating." });
    expect(underReview.status).toBe(200);

    const resolved = await request(app)
      .patch(`/api/admin/review-reports/${reportId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "resolved", resolution_note: "Review hidden." });
    expect(resolved.status).toBe(200);

    const hidden = await request(app)
      .post(`/api/admin/reviews/${farmerReviewId}/hide`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ reason: "Promotional content." });
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.review.is_hidden).toBe(true);

    const publicHidden = await request(app).get(
      `/api/reviews/${farmerReviewId}`,
    );
    expect(publicHidden.status).toBe(404);

    const ownerHidden = await request(app)
      .get(`/api/reviews/${farmerReviewId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(ownerHidden.status).toBe(200);
    expect(ownerHidden.body.data.review.is_hidden).toBe(true);

    const hiddenSummary = await request(app).get(
      `/api/users/${farmer.userId}/reviews/summary`,
    );
    expect(hiddenSummary.body.data.summary.total_reviews).toBe(0);

    const restored = await request(app)
      .post(`/api/admin/reviews/${farmerReviewId}/restore`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(restored.status).toBe(200);
    expect(restored.body.data.review.is_hidden).toBe(false);

    const restoredSummary = await request(app).get(
      `/api/users/${farmer.userId}/reviews/summary`,
    );
    expect(restoredSummary.body.data.summary.total_reviews).toBe(1);
  });
});

describe("Phase 12 verification and trust", () => {
  it("submits verification, stores private documents and updates profile status", async () => {
    const submit = await request(app)
      .post("/api/verifications")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ verification_type: "farmer_identity" });
    expect(submit.status, "submit verification").toBe(201);
    const verificationId = submit.body.data.verification.id as string;
    expect(submit.body.data.verification.status).toBe("pending");

    const profile = await FarmerProfile.findOne({
      where: { user_id: farmer.userId },
    });
    expect(profile!.verification_status).toBe("pending");

    const duplicate = await request(app)
      .post("/api/verifications")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ verification_type: "farmer_identity" });
    expect(duplicate.status).toBe(409);

    const invalidDocument = await request(app)
      .post(`/api/verifications/${verificationId}/documents`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .field("document_type", "identity_document")
      .attach("document", Buffer.from("not a real pdf"), "fake.pdf");
    expect(invalidDocument.status).toBe(422);

    const upload = await request(app)
      .post(`/api/verifications/${verificationId}/documents`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .field("document_type", "identity_document")
      .attach(
        "document",
        Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"),
        "identity.pdf",
      );
    expect(upload.status, "upload document").toBe(201);
    expect(upload.body.data.document).toMatchObject({
      verification_id: verificationId,
      document_type: "identity_document",
      mime_type: "application/pdf",
    });
    expect(JSON.stringify(upload.body)).not.toContain("storage_key");
    const documentId = upload.body.data.document.id as string;

    const outsiderUpload = await request(app)
      .post(`/api/verifications/${verificationId}/documents`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .field("document_type", "identity_document")
      .attach(
        "document",
        Buffer.from("%PDF-1.4\n%%EOF"),
        "identity.pdf",
      );
    expect(outsiderUpload.status).toBe(404);

    const ownerDownload = await request(app)
      .get(
        `/api/verifications/${verificationId}/documents/${documentId}/download`,
      )
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(ownerDownload.status).toBe(200);
    expect(ownerDownload.headers["content-type"]).toContain(
      "application/pdf",
    );
    expect(ownerDownload.headers["content-disposition"]).toContain(
      "identity.pdf",
    );

    const outsiderDownload = await request(app)
      .get(
        `/api/verifications/${verificationId}/documents/${documentId}/download`,
      )
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderDownload.status).toBe(404);

    const secondUpload = await request(app)
      .post(`/api/verifications/${verificationId}/documents`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .field("document_type", "supporting_document")
      .attach(
        "document",
        Buffer.from("%PDF-1.4\nsecond\n%%EOF"),
        "supporting.pdf",
      );
    expect(secondUpload.status).toBe(201);
    const secondDocumentId = secondUpload.body.data.document.id as string;

    const outsiderDelete = await request(app)
      .delete(
        `/api/verifications/${verificationId}/documents/${secondDocumentId}`,
      )
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderDelete.status).toBe(404);

    const deleted = await request(app)
      .delete(
        `/api/verifications/${verificationId}/documents/${secondDocumentId}`,
      )
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(deleted.status).toBe(200);
    expect(
      await VerificationDocument.findOne({ where: { id: secondDocumentId } }),
    ).toBeNull();

    const status = await request(app)
      .get("/api/verifications/my-status")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(status.status).toBe(200);
    expect(status.body.data.phone_number_verified).toBe(true);
    expect(status.body.data.email_verified).toBe(false);
    const identity = status.body.data.indicators.find(
      (indicator: { verification_type: string }) =>
        indicator.verification_type === "farmer_identity",
    );
    expect(identity.status).toBe("pending");
    expect(status.body.data.requests[0].documents_count).toBe(1);
  });

  it("enforces admin document requirements and rejects with a reason", async () => {
    const submit = await request(app)
      .post("/api/verifications")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ verification_type: "buyer_business" });
    expect(submit.status).toBe(201);
    const verificationId = submit.body.data.verification.id as string;

    const noDocumentApproval = await request(app)
      .post(`/api/admin/verifications/${verificationId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});
    expect(noDocumentApproval.status).toBe(422);

    const rejected = await request(app)
      .post(`/api/admin/verifications/${verificationId}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ reason: "Business registration document is missing." });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.verification.status).toBe("rejected");

    const notification = await Notification.findOne({
      where: {
        user_id: buyer.userId,
        notification_type: "verification_rejected",
        related_entity_id: verificationId,
      },
    });
    expect(notification).not.toBeNull();
  });

  it("approves verification, exposes trust indicators and keeps documents private", async () => {
    const pending = await Verification.findOne({
      where: { user_id: farmer.userId, verification_type: "farmer_identity" },
    });
    expect(pending).not.toBeNull();
    const verificationId = pending!.id;

    const adminList = await request(app)
      .get("/api/admin/verifications?status=pending")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminList.status).toBe(200);
    expect(
      adminList.body.data.verifications.some(
        (verification: { id: string }) => verification.id === verificationId,
      ),
    ).toBe(true);

    const approved = await request(app)
      .post(`/api/admin/verifications/${verificationId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ note: "Identity document verified." });
    expect(approved.status, "approve verification").toBe(200);
    expect(approved.body.data.verification.status).toBe("approved");
    expect(approved.body.data.verification.documents_count).toBe(1);
    expect(JSON.stringify(approved.body)).not.toContain("storage_key");

    const profile = await FarmerProfile.findOne({
      where: { user_id: farmer.userId },
    });
    expect(profile!.verification_status).toBe("verified");

    const approvedNotification = await Notification.findOne({
      where: {
        user_id: farmer.userId,
        notification_type: "verification_approved",
        related_entity_id: verificationId,
      },
    });
    expect(approvedNotification).not.toBeNull();

    const trust = await request(app).get(
      `/api/users/${farmer.userId}/trust-profile`,
    );
    expect(trust.status, "trust profile").toBe(200);
    expect(trust.body.data.trust_profile.has_approved_identity).toBe(true);
    expect(trust.body.data.trust_profile.has_verified_contact).toBe(true);
    expect(trust.body.data.trust_profile.completed_orders).toBe(1);
    expect(
      trust.body.data.trust_profile.completed_deliveries_as_transporter,
    ).toBe(0);
    expect(trust.body.data.trust_profile.ratings.total_reviews).toBe(1);
    expect(JSON.stringify(trust.body)).not.toContain("storage_key");
    expect(JSON.stringify(trust.body)).not.toContain("identity.pdf");

    const document = await VerificationDocument.findOne({
      where: { verification_id: verificationId },
    });
    expect(document).not.toBeNull();
    expect(document!.storage_key).toContain("verifications/");

    const adminDownload = await request(app)
      .get(
        `/api/verifications/${verificationId}/documents/${document!.id}/download`,
      )
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminDownload.status).toBe(200);
  });

  it("does not mark accounts verified when an OTP is invalidated and reissued", async () => {
    const password = "TestPass1!";
    const reg = await request(app).post("/api/auth/register").send({
      phone_number: nextPhone(),
      email: nextEmail(),
      password,
      password_confirm: password,
    });
    expect(reg.status).toBe(201);
    const userId = reg.body.data.user.id as string;

    const firstOtp = await PhoneOtp.findOne({
      where: { user_id: userId, used: false },
      order: [["created_at", "DESC"]],
    });
    expect(firstOtp).not.toBeNull();
    await sequelize.query(
      "UPDATE phone_otps SET created_at = NOW() - INTERVAL '5 minutes' WHERE id = :id",
      { replacements: { id: firstOtp!.id } },
    );

    await issuePhoneOtp(userId);

    const usedCount = await PhoneOtp.count({
      where: { user_id: userId, used: true },
    });
    expect(usedCount).toBe(0);
    const unused = await PhoneOtp.findAll({
      where: { user_id: userId, used: false },
    });
    expect(unused).toHaveLength(1);

    const user = await User.findByPk(userId);
    expect(user!.status).toBe("pending");
  });

  it("exposes review and verification notification preferences", async () => {
    const current = await request(app)
      .get("/api/notifications/preferences")
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(current.status).toBe(200);
    expect(current.body.data.preferences.reviews_enabled).toBe(true);
    expect(current.body.data.preferences.verifications_enabled).toBe(true);

    const updated = await request(app)
      .patch("/api/notifications/preferences")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({ reviews_enabled: false, verifications_enabled: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.preferences.reviews_enabled).toBe(false);
    expect(updated.body.data.preferences.verifications_enabled).toBe(false);
  });
});
