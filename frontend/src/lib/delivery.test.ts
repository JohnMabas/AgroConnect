import { describe, expect, it } from "vitest";
import type { DeliveryData, DeliveryStatus, SafeUser } from "@/lib/api";
import {
  ACTIVE_DELIVERY_STATUSES,
  DELIVERY_STATUSES,
  TERMINAL_DELIVERY_STATUSES,
  deliveryBackHref,
  deliveryCurrentLocation,
  deliveryPermissions,
  formatDeliveryMoney,
} from "@/lib/delivery";

function makeUser(id: string, roles: SafeUser["roles"]): SafeUser {
  return {
    id,
    roles,
    display_name: null,
    phone_number: null,
    email: null,
    status: "active",
    phone_verified: true,
    email_verified: true,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeDelivery(status: DeliveryStatus, overrides: Partial<DeliveryData> = {}): DeliveryData {
  return {
    id: "delivery-1",
    delivery_reference: "DEL-001",
    order_id: "order-1",
    farmer_id: "farmer-1",
    buyer_id: "buyer-1",
    transporter_id: "transporter-1",
    pickup_location: "Lagos",
    delivery_location: "Abuja",
    quantity: 10,
    unit: "bags",
    expected_pickup_date: "2026-01-02",
    expected_delivery_date: "2026-01-03",
    delivery_fee_minor: 500000,
    delivery_fee: 5000,
    currency: "NGN",
    status,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as DeliveryData;
}

describe("delivery helpers", () => {
  it("keeps lifecycle groups consistent", () => {
    expect(DELIVERY_STATUSES).toHaveLength(9);
    expect(ACTIVE_DELIVERY_STATUSES).not.toContain("completed");
    expect(TERMINAL_DELIVERY_STATUSES).toContain("failed");
    expect(formatDeliveryMoney(5000, "NGN")).toContain("5,000");
  });

  it("lets admins assign pending deliveries and confirm delivery completion", () => {
    const admin = makeUser("admin-1", ["admin"]);
    const pending = deliveryPermissions(makeDelivery("pending", { transporter_id: null }), admin);
    const delivered = deliveryPermissions(makeDelivery("delivered"), admin);

    expect(pending.isAdmin).toBe(true);
    expect(pending.canAssign).toBe(true);
    expect(pending.canReassign).toBe(false);
    expect(pending.canAccept).toBe(false);
    expect(delivered.canComplete).toBe(true);
    expect(deliveryBackHref(admin)).toBe("/admin/deliveries");
  });

  it("gives the assigned transporter only transporter-stage actions", () => {
    const transporter = makeUser("transporter-1", ["transporter"]);
    const assigned = deliveryPermissions(makeDelivery("assigned"), transporter);
    const accepted = deliveryPermissions(makeDelivery("accepted"), transporter);
    const inTransit = deliveryPermissions(makeDelivery("in_transit"), transporter);

    expect(assigned.canAccept).toBe(true);
    expect(assigned.canDecline).toBe(true);
    expect(accepted.canPickUp).toBe(true);
    expect(inTransit.canMarkDelivered).toBe(true);
    expect(inTransit.canComplete).toBe(false);
    expect(deliveryBackHref(transporter)).toBe("/transporter/deliveries");
  });

  it("lets buyers confirm a delivered order but not complete transport themselves", () => {
    const buyer = makeUser("buyer-1", ["buyer"]);
    const delivered = deliveryPermissions(makeDelivery("delivered"), buyer);

    expect(delivered.canComplete).toBe(true);
    expect(delivered.canMarkDelivered).toBe(false);
    expect(deliveryBackHref(buyer)).toBe("/buyer/deliveries");
  });

  it("shares live location only for active assigned transporters", () => {
    const transporter = makeUser("transporter-1", ["transporter"]);
    const otherTransporter = makeUser("transporter-2", ["transporter"]);

    expect(
      deliveryPermissions(makeDelivery("accepted"), transporter)
        .canShareLocation,
    ).toBe(true);
    expect(
      deliveryPermissions(makeDelivery("in_transit"), transporter)
        .canShareLocation,
    ).toBe(true);
    expect(
      deliveryPermissions(makeDelivery("delivered"), transporter)
        .canShareLocation,
    ).toBe(false);
    expect(
      deliveryPermissions(makeDelivery("accepted"), otherTransporter)
        .canShareLocation,
    ).toBe(false);
  });

  it("only reads a current location when real coordinates exist", () => {
    expect(deliveryCurrentLocation(makeDelivery("in_transit"))).toBeNull();
    expect(
      deliveryCurrentLocation(
        makeDelivery("in_transit", {
          current_latitude: 9.905,
          current_longitude: 8.871,
          current_location_accuracy_meters: 12,
          current_location_recorded_at: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toEqual({
      latitude: 9.905,
      longitude: 8.871,
      accuracy_meters: 12,
      recorded_at: "2026-01-01T00:00:00.000Z",
    });
  });

  it("denies actions to unrelated users", () => {
    const stranger = makeUser("stranger-1", ["buyer"]);
    const permissions = deliveryPermissions(makeDelivery("assigned"), stranger);

    expect(permissions.canAssign).toBe(false);
    expect(permissions.canAccept).toBe(false);
    expect(permissions.canComplete).toBe(false);
    expect(permissions.canCancel).toBe(false);
  });
});
