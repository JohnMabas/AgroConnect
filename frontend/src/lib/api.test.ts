import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliveriesApi, notificationsApi } from "@/lib/api";

const fetchMock = vi.fn();

function mockOk(data: Record<string, unknown> = {}) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  });
}

function lastRequest(): [string, RequestInit] {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  return fetchMock.mock.calls[0] as [string, RequestInit];
}

describe("Phase 8 API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assigns a transporter with the backend contract", async () => {
    mockOk({ delivery: { id: "delivery-1", status: "assigned" } });

    const result = await deliveriesApi.assign("token-1", "delivery-1", "transporter-1");
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/deliveries\/delivery-1\/assign$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      transporter_id: "transporter-1",
    });
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-1" });
    expect(result.data.delivery.status).toBe("assigned");
  });

  it("submits transporter status transitions", async () => {
    mockOk({ delivery: { id: "delivery-1", status: "in_transit" } });

    await deliveriesApi.updateStatus("token-1", "delivery-1", {
      status: "in_transit",
      location: "Lagos-Ibadan expressway",
    });
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/deliveries\/delivery-1\/status$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      status: "in_transit",
      location: "Lagos-Ibadan expressway",
    });
  });

  it("submits buyer confirmation through the same status endpoint", async () => {
    mockOk({ delivery: { id: "delivery-1", status: "completed" } });

    await deliveriesApi.updateStatus("token-1", "delivery-1", {
      status: "completed",
    });
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/deliveries\/delivery-1\/status$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ status: "completed" });
  });

  it("gets, updates, and reads delivery location history", async () => {
    mockOk({
      location: {
        delivery_id: "delivery-1",
        status: "in_transit",
        current_location: null,
        shareable: true,
      },
    });
    await deliveriesApi.getLocation("token-1", "delivery-1");
    let requestData = lastRequest();

    expect(requestData[0]).toMatch(/\/deliveries\/delivery-1\/location$/);
    expect(requestData[1].method).toBeUndefined();

    fetchMock.mockClear();
    mockOk({
      delivery: { id: "delivery-1" },
      location: {
        delivery_id: "delivery-1",
        status: "in_transit",
        current_location: {
          latitude: 9.905,
          longitude: 8.871,
          accuracy_meters: 12,
          recorded_at: "2026-01-01T00:00:00.000Z",
        },
        shareable: true,
      },
    });
    await deliveriesApi.updateLocation("token-1", "delivery-1", {
      latitude: 9.905,
      longitude: 8.871,
      accuracy_meters: 12,
      recorded_at: "2026-01-01T00:00:00.000Z",
    });
    requestData = lastRequest();

    expect(requestData[0]).toMatch(/\/deliveries\/delivery-1\/location$/);
    expect(requestData[1].method).toBe("PATCH");
    expect(JSON.parse(String(requestData[1].body))).toEqual({
      latitude: 9.905,
      longitude: 8.871,
      accuracy_meters: 12,
      recorded_at: "2026-01-01T00:00:00.000Z",
    });

    fetchMock.mockClear();
    mockOk({ history: { delivery_id: "delivery-1", pings: [] } });
    await deliveriesApi.getLocationHistory("token-1", "delivery-1");
    requestData = lastRequest();

    expect(requestData[0]).toMatch(/\/deliveries\/delivery-1\/location\/history$/);
  });

  it("marks one notification and all notifications read", async () => {
    mockOk({ updated: 1 });
    await notificationsApi.markRead("token-1", "notification-1");
    let requestData = lastRequest();

    expect(requestData[0]).toMatch(/\/notifications\/notification-1\/read$/);
    expect(requestData[1].method).toBe("PATCH");

    fetchMock.mockClear();
    mockOk({ updated: 3 });
    await notificationsApi.markAllRead("token-1");
    requestData = lastRequest();

    expect(requestData[0]).toMatch(/\/notifications\/read-all$/);
    expect(requestData[1].method).toBe("PATCH");
  });

  it("requests unread notifications with the backend query name", async () => {
    mockOk({ notifications: [], total: 0 });

    await notificationsApi.getNotifications("token-1", { unread: true, limit: 10 });
    const [url] = lastRequest();

    expect(url).toContain("unread=true");
    expect(url).toContain("limit=10");
  });
});
