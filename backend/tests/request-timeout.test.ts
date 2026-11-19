import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestLogger } from "../src/middleware/request-logger.js";
import { requestTimeout } from "../src/middleware/request-timeout.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("request logging and timeout", () => {
  it("logs method, path, status and duration", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const app = express();
    app.use(requestLogger);
    app.get("/ok", (_req, res) => {
      res.json({ success: true });
    });

    const response = await request(app).get("/ok");

    expect(response.status).toBe(200);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[http\] GET \/ok 200 \d+ms$/),
    );
  });

  it("returns JSON 504 when a handler never responds", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    app.use(requestLogger);
    app.use(requestTimeout(20));
    app.get("/hang", () => {});

    const response = await request(app).get("/hang");

    expect(response.status).toBe(504);
    expect(response.body).toEqual({
      success: false,
      error: { message: "Request timed out. Please retry." },
    });
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("[http-timeout] GET /hang 20ms"),
    );
  });
});
