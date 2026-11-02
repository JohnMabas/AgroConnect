import { Op } from "sequelize";
import { env } from "../../config/env.js";
import {
  User,
  UserPassword,
  Role,
  UserRole,
  PhoneOtp,
  EmailVerificationToken,
} from "../../database/models/index.js";
import {
  hashPassword,
  verifyPassword,
} from "../../services/password.service.js";
import { issueAndSendPhoneOtp, verifyPhoneOtp } from "../../services/otp.service.js";
import {
  issueEmailVerificationToken,
  verifyEmailToken,
} from "../../services/email-verification.service.js";
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from "../../services/token.service.js";
import {
  normalizeEmail,
  normalizePhoneNumber,
} from "../../utils/contact.js";
import type { RegisterInput, LoginInput } from "./auth.validation.js";
import type { SafeUser, RegisterResult, LoginResult } from "./auth.types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserRoleNames(userId: string): Promise<string[]> {
  const userRoles = await UserRole.findAll({
    where: { user_id: userId },
    include: [{ model: Role, as: "role", attributes: ["name"] }],
  });
  return userRoles.map((ur) => (ur as UserRole & { role: Role }).role.name);
}

async function buildSafeUser(
  user: User,
  roleNames?: string[],
): Promise<SafeUser> {
  const roles = roleNames ?? (await getUserRoleNames(user.id));

  // phone_verified: at least one used phone OTP exists for this user
  const phoneVerified = user.phone_number
    ? (await PhoneOtp.count({
        where: { user_id: user.id, used: true },
      })) > 0
    : false;

  // email_verified: at least one used email token exists for this user
  const emailVerified = user.email
    ? (await EmailVerificationToken.count({
        where: { user_id: user.id, used: true },
      })) > 0
    : false;

  return {
    id: user.id,
    display_name: user.display_name ?? null,
    phone_number: user.phone_number ?? null,
    email: user.email ?? null,
    status: user.status ?? "pending",
    phone_verified: phoneVerified,
    email_verified: emailVerified,
    roles,
    created_at: user.created_at!,
  };
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerUser(
  input: RegisterInput,
): Promise<RegisterResult> {
  const phone = input.phone_number
    ? normalizePhoneNumber(input.phone_number, env.DEFAULT_PHONE_COUNTRY)
    : null;
  const email = input.email ? normalizeEmail(input.email) : null;

  if (phone === null && email === null) {
    throw Object.assign(
      new Error("At least one of phone_number or email is required."),
      { code: "VALIDATION_ERROR" },
    );
  }

  // Check for duplicate contacts.
  const orConditions = [];
  if (phone) orConditions.push({ phone_number: phone });
  if (email) orConditions.push({ email });

  const existing = await User.findOne({ where: { [Op.or]: orConditions } });
  if (existing !== null) {
    // Generic error to prevent contact-method enumeration.
    throw Object.assign(
      new Error("An account with this phone number or email already exists."),
      { code: "DUPLICATE_CONTACT" },
    );
  }

  // Create user.
  const user = await User.create({
    display_name: input.display_name ?? null,
    phone_number: phone,
    email,
    status: "pending",
  });

  // Hash and store password.
  const hash = await hashPassword(input.password);
  await UserPassword.create({ user_id: user.id, hash });

  // Assign default 'farmer' role (users can be re-assigned later).
  // Find or skip if roles aren't seeded yet.
  const farmerRole = await Role.findOne({ where: { name: "farmer" } });
  if (farmerRole) {
    await UserRole.create({ user_id: user.id, role_id: farmerRole.id });
  }

  const safeUser = await buildSafeUser(user, farmerRole ? ["farmer"] : []);

  const result: RegisterResult = { user: safeUser };

  // Trigger OTP / email verification.
  if (phone) {
    try {
      await issueAndSendPhoneOtp(user.id, phone);
      result.phone_otp_pending = true;
    } catch {
      // Non-fatal: the user can resend the OTP from the verification page.
      result.phone_otp_pending = true;
    }
  }

  if (email) {
    try {
      await issueEmailVerificationToken(user.id, email);
      result.email_verification_pending = true;
    } catch {
      // Non-fatal: the user can resend the verification email.
      result.email_verification_pending = true;
    }
  }

  return result;
}

// ─── Phone verification ───────────────────────────────────────────────────────

export async function verifyUserPhone(
  userId: string,
  otp: string,
): Promise<{ user: SafeUser }> {
  const user = await User.findByPk(userId);
  if (!user || !user.phone_number) {
    throw Object.assign(new Error("User not found or has no phone number."), {
      code: "NOT_FOUND",
    });
  }

  const result = await verifyPhoneOtp(userId, otp);

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "No active OTP found. Please request a new one.",
      expired: "Your OTP has expired. Please request a new one.",
      used: "This OTP has already been used. Please request a new one.",
      max_attempts: "Too many incorrect attempts. Please request a new OTP.",
      invalid: "Incorrect OTP. Please check and try again.",
    };
    throw Object.assign(
      new Error(messages[result.reason] ?? "Invalid OTP."),
      { code: "OTP_INVALID", reason: result.reason },
    );
  }

  // Activate the user if pending and this was the only required verification.
  if (user.status === "pending") {
    const needsEmailToo = !!user.email;
    if (!needsEmailToo) {
      await user.update({ status: "active" });
    } else {
      // Check if email is already verified.
      const emailVerified =
        (await EmailVerificationToken.count({
          where: { user_id: userId, used: true },
        })) > 0;
      if (emailVerified) {
        await user.update({ status: "active" });
      }
    }
  }

  const safeUser = await buildSafeUser(await user.reload());
  return { user: safeUser };
}

export async function resendPhoneOtp(
  userId: string,
): Promise<void> {
  const user = await User.findByPk(userId);
  if (!user || !user.phone_number) {
    throw Object.assign(new Error("User not found or has no phone number."), {
      code: "NOT_FOUND",
    });
  }
  await issueAndSendPhoneOtp(userId, user.phone_number);
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function verifyUserEmail(
  rawToken: string,
): Promise<{ user: SafeUser }> {
  const result = await verifyEmailToken(rawToken);

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "Verification link is invalid or has already been used.",
      expired: "Verification link has expired. Please request a new one.",
      used: "Verification link has already been used.",
    };
    throw Object.assign(
      new Error(messages[result.reason] ?? "Invalid verification token."),
      { code: "EMAIL_TOKEN_INVALID", reason: result.reason },
    );
  }

  const user = await User.findByPk(result.userId);
  if (!user) {
    throw Object.assign(new Error("User not found."), { code: "NOT_FOUND" });
  }

  // Activate the user if pending.
  if (user.status === "pending") {
    const needsPhoneToo = !!user.phone_number;
    if (!needsPhoneToo) {
      await user.update({ status: "active" });
    } else {
      const phoneVerified =
        (await PhoneOtp.count({
          where: { user_id: user.id, used: true },
        })) > 0;
      if (phoneVerified) {
        await user.update({ status: "active" });
      }
    }
  }

  const safeUser = await buildSafeUser(await user.reload());
  return { user: safeUser };
}

export async function resendEmailVerification(userId: string): Promise<void> {
  const user = await User.findByPk(userId);
  if (!user || !user.email) {
    throw Object.assign(new Error("User not found or has no email address."), {
      code: "NOT_FOUND",
    });
  }
  await issueEmailVerificationToken(userId, user.email);
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(
  input: LoginInput,
  userAgent?: string,
): Promise<LoginResult> {
  // Normalize the identifier to find the user.
  let phone: string | null = null;
  let email: string | null = null;

  // Determine if the identifier looks like an email or a phone number.
  const isEmail = input.identifier.includes("@");

  if (isEmail) {
    try {
      email = normalizeEmail(input.identifier);
    } catch {
      throw Object.assign(new Error("Invalid credentials."), {
        code: "INVALID_CREDENTIALS",
      });
    }
  } else {
    try {
      phone = normalizePhoneNumber(input.identifier, env.DEFAULT_PHONE_COUNTRY);
    } catch {
      throw Object.assign(new Error("Invalid credentials."), {
        code: "INVALID_CREDENTIALS",
      });
    }
  }

  // Find user by normalized contact.
  const user = await User.findOne({
    where: isEmail ? { email } : { phone_number: phone },
  });

  // Generic error prevents account enumeration.
  if (user === null) {
    throw Object.assign(new Error("Invalid credentials."), {
      code: "INVALID_CREDENTIALS",
    });
  }

  // Check account status.
  if (user.status === "suspended") {
    throw Object.assign(
      new Error("This account has been suspended. Please contact support."),
      { code: "ACCOUNT_SUSPENDED" },
    );
  }

  // Verify that the used login contact method is verified.
  if (isEmail) {
    const emailVerified =
      (await EmailVerificationToken.count({
        where: { user_id: user.id, used: true },
      })) > 0;
    if (!emailVerified) {
      throw Object.assign(
        new Error(
          "Email address is not verified. Please verify your email before logging in.",
        ),
        { code: "EMAIL_NOT_VERIFIED" },
      );
    }
  } else {
    const phoneVerified =
      (await PhoneOtp.count({
        where: { user_id: user.id, used: true },
      })) > 0;
    if (!phoneVerified) {
      throw Object.assign(
        new Error(
          "Phone number is not verified. Please verify your phone before logging in.",
        ),
        { code: "PHONE_NOT_VERIFIED" },
      );
    }
  }

  // Verify password.
  const passwordRecord = await UserPassword.findOne({
    where: { user_id: user.id },
  });

  if (passwordRecord === null) {
    // No password set — should not happen in current flow.
    throw Object.assign(new Error("Invalid credentials."), {
      code: "INVALID_CREDENTIALS",
    });
  }

  const passwordValid = await verifyPassword(
    passwordRecord.hash,
    input.password,
  );

  if (!passwordValid) {
    throw Object.assign(new Error("Invalid credentials."), {
      code: "INVALID_CREDENTIALS",
    });
  }

  const roleNames = await getUserRoleNames(user.id);
  const accessToken = signAccessToken({ sub: user.id, roles: roleNames });
  const refreshToken = await issueRefreshToken(user.id, userAgent);

  const safeUser = await buildSafeUser(user, roleNames);
  return { user: safeUser, access_token: accessToken, refresh_token: refreshToken };
}

// ─── Token refresh ────────────────────────────────────────────────────────────

export async function refreshSession(
  rawRefreshToken: string,
  userAgent?: string,
): Promise<{ access_token: string; refresh_token: string; user: SafeUser }> {
  // Load the user roles before rotating (needed for new access token).
  // We look up the user from the existing token first.
  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(rawRefreshToken).digest("hex");
  const { RefreshToken: RT } = await import("../../database/models/index.js");
  const existing = await RT.findOne({ where: { token_hash: tokenHash } });
  if (!existing) {
    throw Object.assign(new Error("Invalid or expired session."), {
      code: "INVALID_TOKEN",
    });
  }
  const roleNames = await getUserRoleNames(existing.user_id);

  const result = await rotateRefreshToken(rawRefreshToken, roleNames, userAgent);

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "Session not found.",
      expired: "Session has expired. Please log in again.",
      revoked: "Session has been revoked. Please log in again.",
      reuse_detected:
        "Security alert: session token was reused. All sessions have been invalidated. Please log in again.",
    };
    throw Object.assign(
      new Error(messages[result.reason] ?? "Invalid session."),
      { code: "INVALID_TOKEN", reason: result.reason },
    );
  }

  const user = await User.findByPk(result.userId);
  if (!user) {
    throw Object.assign(new Error("User not found."), { code: "NOT_FOUND" });
  }

  const safeUser = await buildSafeUser(user, result.roles);
  return {
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    user: safeUser,
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(rawRefreshToken: string): Promise<void> {
  await revokeRefreshToken(rawRefreshToken);
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await revokeAllUserRefreshTokens(userId);
}

// ─── Get current user ─────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await User.findByPk(userId);
  if (!user) {
    throw Object.assign(new Error("User not found."), { code: "NOT_FOUND" });
  }
  return buildSafeUser(user);
}
