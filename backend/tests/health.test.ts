import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { migrateTestDatabase } from "./test-database.js";

describe("GET /api/health", () => {
  beforeAll(async () => {
    await migrateTestDatabase();
  });

  it("returns HTTP 200 when the database is available", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: "ok",
        service: "agroconnect-api",
        api: "up",
        database: {
          status: "up",
        },
      },
    });
    expect(typeof response.body.data.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.data.timestamp))).toBe(false);
  });

  it("returns HTTP 503 when the database is unavailable", async () => {
    const app = createApp({
      checkDatabaseHealth: async () => ({ status: "down" }),
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      data: {
        status: "unavailable",
        api: "up",
        database: {
          status: "down",
        },
      },
      error: {
        message: "Database is unavailable.",
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|postgres:\/\//i);
  });
});
