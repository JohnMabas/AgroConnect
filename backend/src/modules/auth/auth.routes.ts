import { Router } from "express";
import rateLimit from "express-rate-limit";
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

// Rate limits — applied per IP address.

// Strict limit for registration and login to prevent abuse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many requests. Please try again later." },
  },
});

// Even stricter for OTP operations.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many OTP requests. Please try again later." },
  },
});

// Moderate limit for token refresh.
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many refresh requests. Please try again later." },
  },
});

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
