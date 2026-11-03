import type { RequestHandler } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import {
  register,
  verifyPhone,
  resendOtp,
  verifyEmail,
  resendEmailVerify,
  login,
  refresh,
  logout,
  logoutAll,
  me,
} from "./auth.controller.js";

// Rate limits — applied per IP address in non-test environments.
// In test mode the limiters are replaced with pass-through middleware so that
// automated tests can make many requests without hitting rate limits.

function makeLimiter(
  windowMs: number,
  limit: number,
  message: object,
): RequestHandler {
  if (env.NODE_ENV === "test") {
    // Pass-through — no rate limiting during tests.
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message,
  }) as unknown as RequestHandler;
}

const authLimiter = makeLimiter(
  15 * 60 * 1000,
  10,
  { success: false, error: { message: "Too many requests. Please try again later." } },
);

const otpLimiter = makeLimiter(
  15 * 60 * 1000,
  5,
  { success: false, error: { message: "Too many OTP requests. Please try again later." } },
);

const refreshLimiter = makeLimiter(
  5 * 60 * 1000,
  20,
  { success: false, error: { message: "Too many refresh requests. Please try again later." } },
);

export function createAuthRouter(): Router {
  const router = Router();

  // Registration
  router.post("/register", authLimiter, register);

  // Phone verification
  router.post("/verify-phone", otpLimiter, verifyPhone);
  router.post("/resend-phone-otp", otpLimiter, resendOtp);

  // Email verification
  router.post("/verify-email", otpLimiter, verifyEmail);
  router.post("/resend-email-verification", otpLimiter, resendEmailVerify);

  // Session management
  router.post("/login", authLimiter, login);
  router.post("/refresh", refreshLimiter, refresh);
  router.post("/logout", logout);
  router.post("/logout-all", authenticate, logoutAll);
  router.get("/me", authenticate, me);

  return router;
}
