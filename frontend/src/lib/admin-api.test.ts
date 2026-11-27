import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminApi,
  farmerProtectionAdminApi,
  integrityAdminApi,
  transporterApi,
} from "@/lib/api";

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

describe("Phase 8A admin API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the admin overview", async () => {
    mockOk({ overview: { total_users: 42 } });

    const result = await adminApi.overview("admin-token");
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/admin\/overview$/);
    expect(init.method).toBeUndefined();
    expect(init.headers).toMatchObject({ Authorization: "Bearer admin-token" });
    expect(result.data.overview.total_users).toBe(42);
  });

  it("sends admin user filters as query params", async () => {
    mockOk({ users: [], total: 0, page: 2, limit: 20, total_pages: 0 });

    await adminApi.listUsers("admin-token", {
      page: 2,
      limit: 20,
      search: "ada",
      role: "farmer",
      status: "active",
    });
    const [url] = lastRequest();

    expect(url).toMatch(/\/admin\/users\?/);
    expect(url).toContain("page=2");
    expect(url).toContain("limit=20");
    expect(url).toContain("search=ada");
    expect(url).toContain("role=farmer");
    expect(url).toContain("status=active");
  });

  it("updates a user status with a reason", async () => {
    mockOk({ user: { id: "user-1", status: "suspended" } });

    await adminApi.updateUserStatus("admin-token", "user-1", "suspended", "spam");
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/admin\/users\/user-1\/status$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      status: "suspended",
      reason: "spam",
    });
    expect(init.headers).toMatchObject({ Authorization: "Bearer admin-token" });
  });

  it("rejects a transporter application", async () => {
    mockOk({ transporter: { id: "t-1", status: "rejected" } });

    await adminApi.rejectTransporter("admin-token", "t-1", "incomplete documents");
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/admin\/transporters\/t-1\/reject$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      reason: "incomplete documents",
    });
  });

  it("moderates a listing", async () => {
    mockOk({ listing: { id: "l-1", status: "hidden" } });

    await adminApi.moderateListing("admin-token", "l-1", "hide", "policy violation");
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/admin\/listings\/l-1\/moderate$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      action: "hide",
      reason: "policy violation",
    });
  });

  it("calls the transporter moderation endpoints", async () => {
    mockOk({ transporter: { id: "t-1", status: "approved" } });

    await transporterApi.adminApprove("admin-token", "t-1");
    let [url, init] = lastRequest();
    expect(url).toMatch(/\/transporters\/t-1\/approve$/);
    expect(init.method).toBe("PATCH");
    expect(init.headers).toMatchObject({ Authorization: "Bearer admin-token" });

    fetchMock.mockClear();
    mockOk({ transporter: { id: "t-1", status: "suspended" } });

    await transporterApi.adminSuspend("admin-token", "t-1", "fraud");
    [url, init] = lastRequest();
    expect(url).toMatch(/\/transporters\/t-1\/suspend$/);
    expect(JSON.parse(String(init.body))).toEqual({ reason: "fraud" });

    fetchMock.mockClear();
    mockOk({ transporter: { id: "t-1", status: "pending" } });

    await transporterApi.adminReactivate("admin-token", "t-1");
    [url, init] = lastRequest();
    expect(url).toMatch(/\/transporters\/t-1\/reactivate$/);
    expect(init.method).toBe("PATCH");
  });

  it("lists farmer-protection agents", async () => {
    mockOk({ items: [], total: 0, page: 1, limit: 20, total_pages: 0 });

    await farmerProtectionAdminApi.listAgents("admin-token", {
      page: 1,
      status: "active",
      verification_status: "pending",
    });
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/admin\/farmer-protection\/agents\?/);
    expect(url).toContain("status=active");
    expect(url).toContain("verification_status=pending");
    expect(init.headers).toMatchObject({ Authorization: "Bearer admin-token" });
  });

  it("verifies and suspends an agent", async () => {
    mockOk({ agent: { id: "a-1", verification_status: "approved" } });

    await farmerProtectionAdminApi.verifyAgent("admin-token", "a-1", "approved", "checked");
    let [url, init] = lastRequest();
    expect(url).toMatch(/\/admin\/farmer-protection\/agents\/a-1\/verify$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      status: "approved",
      notes: "checked",
    });

    fetchMock.mockClear();
    mockOk({ agent: { id: "a-1", status: "suspended" } });

    await farmerProtectionAdminApi.suspendAgent("admin-token", "a-1", "misconduct");
    [url, init] = lastRequest();
    expect(url).toMatch(/\/admin\/farmer-protection\/agents\/a-1\/suspend$/);
    expect(JSON.parse(String(init.body))).toEqual({ reason: "misconduct" });
  });

  it("lists integrity assessments with review filters", async () => {
    mockOk({ items: [], total: 0, page: 1, limit: 20, total_pages: 0 });

    await integrityAdminApi.list("admin-token", {
      page: 1,
      review_status: "pending",
      risk_level: "high",
      sort: "risk_desc",
    });
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/admin\/ai\/integrity\?/);
    expect(url).toContain("review_status=pending");
    expect(url).toContain("risk_level=high");
    expect(url).toContain("sort=risk_desc");
    expect(init.headers).toMatchObject({ Authorization: "Bearer admin-token" });
  });

  it("submits an integrity review decision", async () => {
    mockOk({ id: "i-1", review_status: "confirmed" });

    await integrityAdminApi.review("admin-token", "i-1", {
      action: "resolve",
      notes: "confirmed by admin",
    });
    const [url, init] = lastRequest();

    expect(url).toMatch(/\/admin\/ai\/integrity\/i-1\/review$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      action: "resolve",
      notes: "confirmed by admin",
    });
  });
});
