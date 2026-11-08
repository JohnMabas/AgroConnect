/**
 * Phase 10 — Transport and delivery management.
 *
 * Covers transporter profiles and approval, delivery request validation,
 * transporter assignment, the delivery lifecycle, tracking history, access
 * control and order/delivery status consistency. No payment provider calls are
 * made; paid orders are marked paid directly in the database so this suite
 * focuses on transport behaviour.
 */

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import {
  DeliveryHistory,
  Order,
  Role,
  TransporterProfile,
  UserRole,
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

interface OrderPayload {
  id: string;
  order_number: string;
  offer_id: string;
  listing_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  delivery_location: string | null;
  delivery_date: string | null;
}

interface DeliveryPayload {
  id: string;
  delivery_reference: string;
  order_id: string;
  farmer_id: string;
  buyer_id: string;
  transporter_id: string | null;
  pickup_location: string;
  delivery_location: string;
  produce_description: string;
  quantity: number;
  unit: string;
  expected_pickup_date: string;
  expected_delivery_date: string;
  delivery_fee_minor: number;
  delivery_fee: number;
  currency: string;
  status: string;
  created_by_user_id: string | null;
  order?: {
    id: string;
    status: string;
    payment_status: string;
  };
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234809${String(phoneCounter).padStart(8, "0")}`;
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

async function grantRole(userId: string, roleName: string): Promise<void> {
  const role = await Role.findOne({ where: { name: roleName } });
  expect(role, `role ${roleName}`).not.toBeNull();
  await UserRole.findOrCreate({
    where: { user_id: userId, role_id: role!.id },
    defaults: { user_id: userId, role_id: role!.id },
  });
}

async function registerFarmerAndLogin(phone: string): Promise<AuthUser> {
  const auth = await registerAndLogin(phone);
  const res = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${auth.token}`)
    .send({
      farm_name: `Phase 10 Farm of ${phone}`,
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
      title: "Phase 10 Delivery Listing",
      quantity: 100,
      unit: "kg",
      price_per_unit: 250,
      currency: "NGN",
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      community: "Bukuru",
      expiry_date: dateOffset(30),
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

async function createAcceptedOffer(
  buyerToken: string,
  farmerToken: string,
  listingId: string,
  quantity: number,
  unitPrice = 240,
): Promise<string> {
  const created = await request(app)
    .post("/api/offers")
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({
      listing_id: listingId,
      quantity,
      unit: "kg",
      unit_price: unitPrice,
      currency: "NGN",
      delivery_terms: "Delivered to the buyer's market address.",
      delivery_location: "Bukuru, Jos South",
      delivery_date: dateOffset(5),
      buyer_message: "Please confirm the quality and availability.",
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
  const res = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ offer_id: offerId });
  expect(res.status, "create order").toBe(201);
  return res.body.data.order as OrderPayload;
}

async function createPaidOrder(quantity: number): Promise<OrderPayload> {
  const offerId = await createAcceptedOffer(
    buyer.token,
    farmer.token,
    listingId,
    quantity,
  );
  const order = await createOrder(buyer.token, offerId);

  const row = await Order.findByPk(order.id);
  await row!.update({
    status: "paid",
    payment_status: "paid",
    paid_at: new Date(),
  });

  return {
    ...order,
    status: "paid",
    payment_status: "paid",
  };
}

function deliveryPayload(
  order: OrderPayload,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    order_id: order.id,
    pickup_location: "Bukuru Farm Gate, Jos South",
    delivery_location: order.delivery_location,
    produce_description: "Fresh maize in good condition",
    quantity: order.quantity,
    unit: order.unit,
    expected_pickup_date: dateOffset(1),
    expected_delivery_date: order.delivery_date,
    delivery_fee: 1250.5,
    currency: "NGN",
    additional_instructions: "Call the buyer on arrival.",
    ...overrides,
  };
}

let farmer: AuthUser;
let buyer: AuthUser;
let outsider: AuthUser;
let admin: AuthUser;
let transporter: AuthUser;
let lagosTransporter: AuthUser;
let pendingTransporter: AuthUser;
let produceTypeId: string;
let listingId: string;
let paidOrder: OrderPayload;
let unpaidOrder: OrderPayload;
let transporterProfileId: string;
let lagosProfileId: string;
let deliveryId: string;

beforeAll(async () => {
  farmer = await registerFarmerAndLogin(nextPhone());
  buyer = await registerAndLogin(nextPhone());
  outsider = await registerAndLogin(nextPhone());
  admin = await registerAndLogin(nextPhone());
  transporter = await registerAndLogin(nextPhone());
  lagosTransporter = await registerAndLogin(nextPhone());
  pendingTransporter = await registerAndLogin(nextPhone());

  await grantRole(admin.userId, "admin");

  produceTypeId = await getFirstProduceTypeId();
  listingId = await createPublishedListing(farmer.token, produceTypeId);

  paidOrder = await createPaidOrder(10);

  const unpaidOfferId = await createAcceptedOffer(
    buyer.token,
    farmer.token,
    listingId,
    5,
  );
  unpaidOrder = await createOrder(buyer.token, unpaidOfferId);
}, 300_000);

describe("Phase 10 transporter management", () => {
  it("requires authentication on transporter and delivery routes", async () => {
    const profile = await request(app).get("/api/transporters/profile");
    const available = await request(app).get("/api/transporters/available");
    const deliveries = await request(app).get("/api/deliveries");
    const myDeliveries = await request(app).get(
      "/api/transporters/my-deliveries",
    );

    expect(profile.status).toBe(401);
    expect(available.status).toBe(401);
    expect(deliveries.status).toBe(401);
    expect(myDeliveries.status).toBe(401);
  });

  it("creates and updates a transporter profile", async () => {
    const created = await request(app)
      .post("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({
        business_name: "Jos Fresh Logistics",
        contact_phone: "+2348031234567",
        operating_location: "Jos, Plateau State",
        coverage_areas: ["Jos South", "Jos North"],
        vehicle_type: "Refrigerated truck",
        vehicle_registration_number: "PL-123-ABC",
        vehicle_capacity: "5 tonnes",
        produce_types: ["maize", "tomatoes"],
      });
    expect(created.status).toBe(201);
    expect(created.body.data.profile).toMatchObject({
      user_id: transporter.userId,
      business_name: "Jos Fresh Logistics",
      availability_status: "unavailable",
      approval_status: "pending",
    });
    transporterProfileId = created.body.data.profile.id as string;

    const duplicate = await request(app)
      .post("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({
        business_name: "Duplicate Logistics",
        contact_phone: "+2348031234568",
        operating_location: "Jos",
        coverage_areas: ["Jos South"],
      });
    expect(duplicate.status).toBe(409);

    const mine = await request(app)
      .get("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.profile.id).toBe(transporterProfileId);

    const earlyAvailability = await request(app)
      .patch("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ availability_status: "available" });
    expect(earlyAvailability.status).toBe(422);

    const updated = await request(app)
      .patch("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({
        vehicle_capacity: "8 tonnes",
        coverage_areas: ["Jos South", "Jos North", "Bukuru"],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.profile.vehicle_capacity).toBe("8 tonnes");
    expect(updated.body.data.profile.coverage_areas).toContain("Bukuru");
  });

  it("restricts approval, suspension and reactivation to administrators", async () => {
    const nonAdminApprove = await request(app)
      .patch(`/api/transporters/${transporterProfileId}/approve`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(nonAdminApprove.status).toBe(403);

    const approved = await request(app)
      .patch(`/api/transporters/${transporterProfileId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.profile).toMatchObject({
      approval_status: "approved",
      availability_status: "unavailable",
    });

    const available = await request(app)
      .patch("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ availability_status: "available" });
    expect(available.status).toBe(200);

    const listed = await request(app)
      .get("/api/transporters/available?location=Jos%20South")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(listed.status).toBe(200);
    expect(
      listed.body.data.transporters.map(
        (profile: { id: string }) => profile.id,
      ),
    ).toContain(transporterProfileId);

    const notCovered = await request(app)
      .get("/api/transporters/available?location=Lagos%20Island")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(notCovered.status).toBe(200);
    expect(
      notCovered.body.data.transporters.map(
        (profile: { id: string }) => profile.id,
      ),
    ).not.toContain(transporterProfileId);

    const pendingProfile = await request(app)
      .post("/api/transporters/profile")
      .set("Authorization", `Bearer ${pendingTransporter.token}`)
      .send({
        business_name: "Pending Transport Co",
        contact_phone: "+2348031234569",
        operating_location: "Jos",
        coverage_areas: ["Jos South"],
      });
    expect(pendingProfile.status).toBe(201);
    const pendingId = pendingProfile.body.data.profile.id as string;

    const outsiderView = await request(app)
      .get(`/api/transporters/${pendingId}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    const selfView = await request(app)
      .get(`/api/transporters/${pendingId}`)
      .set("Authorization", `Bearer ${pendingTransporter.token}`);
    const adminView = await request(app)
      .get(`/api/transporters/${pendingId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(outsiderView.status).toBe(404);
    expect(selfView.status).toBe(200);
    expect(adminView.status).toBe(200);

    const nonAdminSuspend = await request(app)
      .patch(`/api/transporters/${transporterProfileId}/suspend`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ reason: "Not allowed." });
    expect(nonAdminSuspend.status).toBe(403);

    const suspended = await request(app)
      .patch(`/api/transporters/${transporterProfileId}/suspend`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ reason: "Compliance review." });
    expect(suspended.status).toBe(200);
    expect(suspended.body.data.profile).toMatchObject({
      approval_status: "suspended",
      availability_status: "suspended",
      suspended_reason: "Compliance review.",
    });

    const suspendedUpdate = await request(app)
      .patch("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ vehicle_capacity: "10 tonnes" });
    expect(suspendedUpdate.status).toBe(422);

    const reactivated = await request(app)
      .patch(`/api/transporters/${transporterProfileId}/reactivate`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.data.profile).toMatchObject({
      approval_status: "approved",
      availability_status: "unavailable",
    });

    const availableAgain = await request(app)
      .patch("/api/transporters/profile")
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ availability_status: "available" });
    expect(availableAgain.status).toBe(200);

    const lagosProfile = await request(app)
      .post("/api/transporters/profile")
      .set("Authorization", `Bearer ${lagosTransporter.token}`)
      .send({
        business_name: "Lagos Island Haulage",
        contact_phone: "+2348031234570",
        operating_location: "Lagos",
        coverage_areas: ["Lagos Island"],
      });
    expect(lagosProfile.status).toBe(201);
    lagosProfileId = lagosProfile.body.data.profile.id as string;

    await request(app)
      .patch(`/api/transporters/${lagosProfileId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
    await request(app)
      .patch("/api/transporters/profile")
      .set("Authorization", `Bearer ${lagosTransporter.token}`)
      .send({ availability_status: "available" })
      .expect(200);
  });
});

describe("Phase 10 delivery requests", () => {
  it("rejects delivery requests for unpaid orders and mismatched terms", async () => {
    const unpaid = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(unpaidOrder));
    expect(unpaid.status).toBe(422);
    expect(unpaid.body.error.message).toMatch(/cannot be created/i);

    const outsiderCreate = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send(deliveryPayload(paidOrder));
    expect(outsiderCreate.status).toBe(403);

    const wrongQuantity = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(paidOrder, { quantity: 9 }));
    expect(wrongQuantity.status).toBe(422);

    const wrongLocation = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(paidOrder, { delivery_location: "Abuja" }));
    expect(wrongLocation.status).toBe(422);

    const wrongCurrency = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(paidOrder, { currency: "USD" }));
    expect(wrongCurrency.status).toBe(422);

    const negativeFee = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(paidOrder, { delivery_fee: -1 }));
    expect(negativeFee.status).toBe(422);
  });

  it("creates one delivery from a paid order and prevents duplicates", async () => {
    const created = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(paidOrder));
    expect(created.status).toBe(201);

    const delivery = created.body.data.delivery as DeliveryPayload;
    deliveryId = delivery.id;

    expect(delivery).toMatchObject({
      order_id: paidOrder.id,
      buyer_id: buyer.userId,
      farmer_id: farmer.userId,
      transporter_id: null,
      delivery_location: "Bukuru, Jos South",
      quantity: 10,
      unit: "kg",
      delivery_fee_minor: 125050,
      delivery_fee: 1250.5,
      currency: "NGN",
      status: "pending",
      created_by_user_id: buyer.userId,
    });
    expect(delivery.delivery_reference).toMatch(/^DLV-\d{8}-[A-F0-9]{10}$/);
    expect(delivery.order).toMatchObject({
      id: paidOrder.id,
      payment_status: "paid",
      status: "processing",
    });

    const order = await Order.findByPk(paidOrder.id);
    expect(order!.status).toBe("processing");
    expect(order!.payment_status).toBe("paid");

    const duplicate = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(paidOrder));
    expect(duplicate.status).toBe(409);

    const history = await DeliveryHistory.findAll({
      where: { delivery_id: deliveryId },
    });
    expect(history.map((event) => event.action)).toContain("created");
  });

  it("exposes delivery information only to related participants", async () => {
    const buyerList = await request(app)
      .get("/api/deliveries?status=pending")
      .set("Authorization", `Bearer ${buyer.token}`);
    const farmerList = await request(app)
      .get(`/api/deliveries?order_id=${paidOrder.id}`)
      .set("Authorization", `Bearer ${farmer.token}`);
    const outsiderList = await request(app)
      .get("/api/deliveries")
      .set("Authorization", `Bearer ${outsider.token}`);

    expect(buyerList.status).toBe(200);
    expect(
      buyerList.body.data.deliveries.map(
        (delivery: DeliveryPayload) => delivery.id,
      ),
    ).toContain(deliveryId);
    expect(farmerList.status).toBe(200);
    expect(farmerList.body.data.deliveries).toHaveLength(1);
    expect(outsiderList.status).toBe(200);
    expect(outsiderList.body.data.deliveries).toHaveLength(0);

    const buyerView = await request(app)
      .get(`/api/deliveries/${deliveryId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    const outsiderView = await request(app)
      .get(`/api/deliveries/${deliveryId}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    const outsiderHistory = await request(app)
      .get(`/api/deliveries/${deliveryId}/history`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(buyerView.status).toBe(200);
    expect(outsiderView.status).toBe(404);
    expect(outsiderHistory.status).toBe(404);

    const orderDelivery = await request(app)
      .get(`/api/orders/${paidOrder.id}/delivery`)
      .set("Authorization", `Bearer ${farmer.token}`);
    const outsiderOrderDelivery = await request(app)
      .get(`/api/orders/${paidOrder.id}/delivery`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(orderDelivery.status).toBe(200);
    expect(orderDelivery.body.data.delivery.id).toBe(deliveryId);
    expect(outsiderOrderDelivery.status).toBe(404);
  });
});

describe("Phase 10 delivery assignment and lifecycle", () => {
  it("validates transporter eligibility before assignment", async () => {
    const nonAdmin = await request(app)
      .patch(`/api/deliveries/${deliveryId}/assign`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ transporter_id: transporter.userId });
    expect(nonAdmin.status).toBe(403);

    const pendingProfile = await TransporterProfile.findOne({
      where: { user_id: pendingTransporter.userId },
    });
    const pendingAssignment = await request(app)
      .patch(`/api/deliveries/${deliveryId}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transporter_id: pendingProfile!.user_id });
    expect(pendingAssignment.status).toBe(422);

    const wrongCoverage = await request(app)
      .patch(`/api/deliveries/${deliveryId}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transporter_id: lagosTransporter.userId });
    expect(wrongCoverage.status).toBe(422);

    const assigned = await request(app)
      .patch(`/api/deliveries/${deliveryId}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transporter_id: transporter.userId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.delivery).toMatchObject({
      status: "assigned",
      transporter_id: transporter.userId,
    });

    const myDeliveries = await request(app)
      .get("/api/transporters/my-deliveries")
      .set("Authorization", `Bearer ${transporter.token}`);
    expect(myDeliveries.status).toBe(200);
    expect(
      myDeliveries.body.data.deliveries.map(
        (delivery: DeliveryPayload) => delivery.id,
      ),
    ).toContain(deliveryId);

    const otherTransporterView = await request(app)
      .get(`/api/deliveries/${deliveryId}`)
      .set("Authorization", `Bearer ${lagosTransporter.token}`);
    expect(otherTransporterView.status).toBe(404);

    const assignAgain = await request(app)
      .patch(`/api/deliveries/${deliveryId}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transporter_id: transporter.userId });
    expect(assignAgain.status).toBe(422);

    const reassigned = await request(app)
      .patch(`/api/deliveries/${deliveryId}/reassign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transporter_id: transporter.userId });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.data.delivery.status).toBe("assigned");
  });

  it("enforces the delivery status lifecycle and order consistency", async () => {
    const outsiderAccept = await request(app)
      .patch(`/api/deliveries/${deliveryId}/accept`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderAccept.status).toBe(403);

    const accepted = await request(app)
      .patch(`/api/deliveries/${deliveryId}/accept`)
      .set("Authorization", `Bearer ${transporter.token}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.delivery.status).toBe("accepted");
    expect((await Order.findByPk(paidOrder.id))!.status).toBe(
      "ready_for_delivery",
    );

    const buyerPickedUp = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ status: "picked_up" });
    expect(buyerPickedUp.status).toBe(403);

    const pickedUp = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ status: "picked_up", location: "Bukuru Farm Gate" });
    expect(pickedUp.status).toBe(200);
    expect(pickedUp.body.data.delivery.status).toBe("picked_up");

    const pickUpAgain = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ status: "picked_up" });
    expect(pickUpAgain.status).toBe(422);

    const inTransit = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ status: "in_transit", location: "Jos Ring Road" });
    expect(inTransit.status).toBe(200);
    expect((await Order.findByPk(paidOrder.id))!.status).toBe("in_transit");

    const failedWithoutReason = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ status: "failed" });
    expect(failedWithoutReason.status).toBe(422);

    const delivered = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ status: "delivered" });
    expect(delivered.status).toBe(200);
    expect((await Order.findByPk(paidOrder.id))!.status).toBe("delivered");
    expect((await Order.findByPk(paidOrder.id))!.payment_status).toBe("paid");

    const transporterComplete = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ status: "completed" });
    expect(transporterComplete.status).toBe(403);

    const buyerComplete = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ status: "completed" });
    expect(buyerComplete.status).toBe(200);
    expect(buyerComplete.body.data.delivery.status).toBe("completed");
    expect((await Order.findByPk(paidOrder.id))!.status).toBe("completed");

    const reopen = await request(app)
      .patch(`/api/deliveries/${deliveryId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "in_transit" });
    expect(reopen.status).toBe(422);

    const history = await request(app)
      .get(`/api/deliveries/${deliveryId}/history`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(history.status).toBe(200);
    const actions = history.body.data.history.events.map(
      (event: { action: string; new_status: string | null }) => event.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        "created",
        "assigned",
        "reassigned",
        "accepted",
        "status_changed",
        "completed",
      ]),
    );
    expect(history.body.data.history.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          previous_status: "assigned",
          new_status: "accepted",
          actor_user_id: transporter.userId,
        }),
        expect.objectContaining({
          previous_status: "in_transit",
          new_status: "delivered",
          actor_user_id: transporter.userId,
        }),
      ]),
    );
  });

  it("supports declining, failing with a reason, and replacing a failed delivery", async () => {
    const order = await createPaidOrder(4);
    const created = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${farmer.token}`)
      .send(deliveryPayload(order));
    expect(created.status).toBe(201);
    const replacementDeliveryId = created.body.data.delivery.id as string;

    await request(app)
      .patch(`/api/deliveries/${replacementDeliveryId}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transporter_id: transporter.userId })
      .expect(200);

    const declined = await request(app)
      .patch(`/api/deliveries/${replacementDeliveryId}/decline`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ reason: "Vehicle is in the workshop." });
    expect(declined.status).toBe(200);
    expect(declined.body.data.delivery).toMatchObject({
      status: "pending",
      transporter_id: null,
    });

    await request(app)
      .patch(`/api/deliveries/${replacementDeliveryId}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transporter_id: transporter.userId })
      .expect(200);
    await request(app)
      .patch(`/api/deliveries/${replacementDeliveryId}/accept`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .expect(200);
    await request(app)
      .patch(`/api/deliveries/${replacementDeliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({ status: "picked_up" })
      .expect(200);

    const failed = await request(app)
      .patch(`/api/deliveries/${replacementDeliveryId}/status`)
      .set("Authorization", `Bearer ${transporter.token}`)
      .send({
        status: "failed",
        reason: "Road was impassable after heavy rain.",
      });
    expect(failed.status).toBe(200);
    expect(failed.body.data.delivery.status).toBe("failed");
    expect(failed.body.data.delivery.failure_reason).toBe(
      "Road was impassable after heavy rain.",
    );

    const replacement = await request(app)
      .post("/api/deliveries")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send(deliveryPayload(order));
    expect(replacement.status).toBe(201);
    expect(replacement.body.data.delivery.id).not.toBe(replacementDeliveryId);

    const cancelled = await request(app)
      .patch(
        `/api/deliveries/${replacement.body.data.delivery.id}/status`,
      )
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ status: "cancelled", reason: "Buyer no longer needs delivery." });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.delivery.status).toBe("cancelled");
  });
});
