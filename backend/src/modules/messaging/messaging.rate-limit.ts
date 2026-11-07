import type { Request, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";

export interface FixedWindowLimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
  enabled?: boolean;
}

/**
 * Build a per-authenticated-user fixed-window rate limiter.
 *
 * The limiter is enabled outside the automated test environment by default.
 * It can be constructed with `enabled: true` in tests to verify the behaviour
 * deterministically.
 */
export function createFixedWindowLimiter({
  windowMs,
  limit,
  message,
  enabled = env.NODE_ENV !== "test",
}: FixedWindowLimiterOptions): RequestHandler {
  if (!enabled) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.user?.sub ?? req.ip ?? "anonymous",
    message: {
      success: false,
      error: { message },
    },
  }) as unknown as RequestHandler;
}
