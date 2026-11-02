import type { Request, Response, NextFunction } from "express";
import type { ZodError } from "zod";
import {
  RegisterSchema,
  VerifyPhoneSchema,
  ResendPhoneOtpSchema,
  VerifyEmailSchema,
  ResendEmailVerificationSchema,
  LoginSchema,
} from "./auth.validation.js";
import {
  registerUser,
  verifyUserPhone,
  resendPhoneOtp,
  verifyUserEmail,
  resendEmailVerification,
  loginUser,
  refreshSession,
  logoutUser,
  logoutAllSessions,
  getCurrentUser,
} from "./auth.service.js";

const REFRESH_TOKEN_COOKIE = "refresh_token";

// Cookie options used when setting the refresh token.
function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: maxAgeMs,
    path: "/api/auth",
  };
}

function refreshTokenMaxAge(): number {
  // Parse JWT_REFRESH_EXPIRES_IN (e.g. "7d") to milliseconds.
  const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1] ?? "7", 10);
  const u = match[2] ?? "d";
  const ms: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (ms[u] ?? 86_400_000);
}

function zodErrorToFields(err: ZodError) {
  return err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await registerUser(parsed.data);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: result,
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (
      e.code === "DUPLICATE_CONTACT" ||
      e.code === "VALIDATION_ERROR"
    ) {
      res.status(409).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Phone verification ───────────────────────────────────────────────────────

export async function verifyPhone(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = VerifyPhoneSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await verifyUserPhone(parsed.data.user_id, parsed.data.otp);
    res.json({ success: true, message: "Phone number verified.", data: result });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "OTP_INVALID" || e.code === "NOT_FOUND") {
      res.status(400).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function resendOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = ResendPhoneOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    await resendPhoneOtp(parsed.data.user_id);
    res.json({ success: true, message: "OTP sent." });
  } catch (err) {
    const e = err as Error & { code?: string; retryAfterSeconds?: number };
    if (e.code === "OTP_COOLDOWN") {
      res
        .status(429)
        .set("Retry-After", String(e.retryAfterSeconds ?? 60))
        .json({ success: false, error: { message: e.message } });
      return;
    }
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = VerifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await verifyUserEmail(parsed.data.token);
    res.json({
      success: true,
      message: "Email address verified.",
      data: result,
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "EMAIL_TOKEN_INVALID" || e.code === "NOT_FOUND") {
      res.status(400).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function resendEmailVerify(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = ResendEmailVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    await resendEmailVerification(parsed.data.user_id);
    res.json({ success: true, message: "Verification email sent." });
  } catch (err) {
    const e = err as Error & { code?: string; retryAfterSeconds?: number };
    if (e.code === "EMAIL_VERIFY_COOLDOWN") {
      res
        .status(429)
        .set("Retry-After", String(e.retryAfterSeconds ?? 60))
        .json({ success: false, error: { message: e.message } });
      return;
    }
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const userAgent = req.headers["user-agent"];
    const result = await loginUser(parsed.data, userAgent);

    // Set refresh token in an HttpOnly cookie.
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refresh_token,
      cookieOptions(refreshTokenMaxAge()),
    );

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        user: result.user,
        access_token: result.access_token,
        // Do not include the raw refresh token in the response body —
        // it is only available via the HttpOnly cookie.
      },
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (
      e.code === "INVALID_CREDENTIALS" ||
      e.code === "PHONE_NOT_VERIFIED" ||
      e.code === "EMAIL_NOT_VERIFIED"
    ) {
      res.status(401).json({ success: false, error: { message: e.message } });
      return;
    }
    if (e.code === "ACCOUNT_SUSPENDED") {
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Read the refresh token from the HttpOnly cookie.
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    if (!rawRefreshToken) {
      res.status(401).json({
        success: false,
        error: { message: "No refresh token. Please log in." },
      });
      return;
    }

    const userAgent = req.headers["user-agent"];
    const result = await refreshSession(rawRefreshToken, userAgent);

    // Rotate the cookie with the new refresh token.
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refresh_token,
      cookieOptions(refreshTokenMaxAge()),
    );

    res.json({
      success: true,
      data: { access_token: result.access_token, user: result.user },
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "INVALID_TOKEN" || e.code === "NOT_FOUND") {
      // Clear the stale cookie.
      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/auth" });
      res.status(401).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    if (rawRefreshToken) {
      await logoutUser(rawRefreshToken);
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/auth" });
    res.json({ success: true, message: "Logged out." });
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required." },
      });
      return;
    }

    await logoutAllSessions(req.user.sub);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/auth" });
    res.json({ success: true, message: "All sessions logged out." });
  } catch (err) {
    next(err);
  }
}

// ─── Me ───────────────────────────────────────────────────────────────────────

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required." },
      });
      return;
    }

    const user = await getCurrentUser(req.user.sub);
    res.json({ success: true, data: { user } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}
