import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Op } from "sequelize";
import { env } from "../config/env.js";
import {
  EmailVerificationToken,
  User,
} from "../database/models/index.js";
import { getEmailProvider } from "../integrations/email/index.js";
import { normalizeEmail } from "../utils/contact.js";

// Email verification uses a 6-digit numeric code, matching the phone OTP flow.
const EMAIL_CODE_LENGTH = 6;

function generateRawCode(): string {
  // cryptographically secure random integer in range [0, 999999]
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(EMAIL_CODE_LENGTH, "0");
}

export function hashEmailCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Kept for backwards compatibility with existing imports.
export const hashEmailToken = hashEmailCode;

function hashesMatch(submittedHash: string, storedHash: string): boolean {
  const submitted = Buffer.from(submittedHash, "hex");
  const stored = Buffer.from(storedHash, "hex");
  return (
    submitted.length === stored.length && timingSafeEqual(submitted, stored)
  );
}

/**
 * Issue a new email verification code and send it to the given address.
 * Enforces a resend cooldown to prevent abuse.
 *
 * The raw code is delivered only by email. It is never returned, logged or
 * stored in this process.
 */
export async function issueEmailVerificationCode(
  userId: string,
  emailAddress: string,
): Promise<void> {
  const now = new Date();
  // Reuse the OTP resend cooldown for email verification resends.
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  const recentCode = await EmailVerificationToken.findOne({
    where: {
      user_id: userId,
      used: false,
      expires_at: { [Op.gt]: now },
      created_at: { [Op.gt]: new Date(now.getTime() - cooldownMs) },
    },
    order: [["created_at", "DESC"]],
  });

  if (recentCode !== null) {
    const retryAfterMs =
      recentCode.created_at!.getTime() + cooldownMs - now.getTime();
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    throw Object.assign(
      new Error(
        `Please wait ${retryAfterSeconds} second(s) before requesting a new verification email.`,
      ),
      { code: "EMAIL_VERIFY_COOLDOWN", retryAfterSeconds },
    );
  }

  // Invalidate prior unused codes. Only successfully consumed codes may have
  // used = true, so those historical records are retained for verification
  // status checks.
  await EmailVerificationToken.destroy({
    where: { user_id: userId, used: false },
  });

  const rawCode = generateRawCode();
  const codeHash = hashEmailCode(rawCode);
  const expiresInSeconds = env.EMAIL_VERIFICATION_EXPIRES_IN_SECONDS;
  const expiryMinutes = Math.max(1, Math.round(expiresInSeconds / 60));
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

  const record = await EmailVerificationToken.create({
    user_id: userId,
    email: emailAddress,
    token_hash: codeHash,
    attempts: 0,
    expires_at: expiresAt,
    used: false,
  });

  const text =
    `Your AgroConnect Verification Code\n\n` +
    `Hello,\n\n` +
    `Welcome to AgroConnect!\n\n` +
    `Use the verification code below to verify your email address:\n\n` +
    `${rawCode}\n\n` +
    `This code expires in ${expiryMinutes} minutes. Do not share it with anyone.\n\n` +
    `If you did not request this code, you can ignore this email.`;

  const html =
    `<h1 style="font-size:20px;color:#102a43;">Your AgroConnect Verification Code</h1>` +
    `<p>Hello,</p>` +
    `<p>Welcome to <strong>AgroConnect</strong>!</p>` +
    `<p>Use the verification code below to verify your email address:</p>` +
    `<p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#102a43;">${rawCode}</p>` +
    `<p>This code expires in ${expiryMinutes} minutes. Do not share it with anyone.</p>` +
    `<p>If you did not request this code, you can ignore this email.</p>`;

  try {
    const emailProvider = getEmailProvider();
    await emailProvider.sendEmail({
      to: emailAddress,
      subject: "Your AgroConnect Verification Code",
      text,
      html,
    });
  } catch (err) {
    // A delivery failure must leave no usable code behind. Verification state
    // is only derived from successfully used records.
    await EmailVerificationToken.destroy({ where: { id: record.id } });
    throw err;
  }
  // rawCode leaves scope here and is not returned or stored in this process.
}

// Kept for backwards compatibility with existing imports.
export const issueEmailVerificationToken = issueEmailVerificationCode;

export type EmailCodeVerificationResult =
  | { success: true; userId: string }
  | {
      success: false;
      reason:
        | "not_found"
        | "expired"
        | "used"
        | "max_attempts"
        | "invalid"
        | "email_mismatch";
    };

export interface VerifyEmailCodeInput {
  userId?: string;
  email?: string;
  code: string;
}

/**
 * Verify a submitted email verification code for a user or email address.
 * Increments the attempt counter on failure and marks the code used on success.
 */
export async function verifyEmailCode(
  input: VerifyEmailCodeInput,
): Promise<EmailCodeVerificationResult> {
  const now = new Date();

  let user: User | null = null;
  if (input.userId !== undefined) {
    user = await User.findByPk(input.userId);
  } else if (input.email !== undefined) {
    user = await User.findOne({ where: { email: normalizeEmail(input.email) } });
  }

  if (user === null || user.email === null) {
    return { success: false, reason: "not_found" };
  }

  if (
    input.email !== undefined &&
    normalizeEmail(input.email) !== user.email
  ) {
    return { success: false, reason: "email_mismatch" };
  }

  // Find the most recent code for this user. This lets us distinguish between
  // a used code and a code that never existed, while older records are removed
  // whenever a new code is issued.
  const record = await EmailVerificationToken.findOne({
    where: { user_id: user.id },
    order: [["created_at", "DESC"]],
  });

  if (record === null) {
    return { success: false, reason: "not_found" };
  }

  if (record.email !== null && record.email !== user.email) {
    return { success: false, reason: "email_mismatch" };
  }

  if (record.used) {
    return { success: false, reason: "used" };
  }

  if (record.expires_at <= now) {
    return { success: false, reason: "expired" };
  }

  if (record.attempts >= env.EMAIL_VERIFICATION_MAX_ATTEMPTS) {
    return { success: false, reason: "max_attempts" };
  }

  const submittedHash = hashEmailCode(input.code);

  if (!hashesMatch(submittedHash, record.token_hash)) {
    await record.update({ attempts: record.attempts + 1 });
    return { success: false, reason: "invalid" };
  }

  // Valid code — mark as used so it cannot be replayed.
  await record.update({ used: true });
  return { success: true, userId: record.user_id };
}

/**
 * Legacy token verification retained for older issued tokens. New email
 * verification codes are always verified with verifyEmailCode.
 */
export async function verifyEmailToken(
  rawToken: string,
): Promise<EmailCodeVerificationResult> {
  const tokenHash = hashEmailCode(rawToken);
  const now = new Date();

  const record = await EmailVerificationToken.findOne({
    where: { token_hash: tokenHash },
  });

  if (record === null) {
    return { success: false, reason: "not_found" };
  }

  if (record.used) {
    return { success: false, reason: "used" };
  }

  if (record.expires_at <= now) {
    return { success: false, reason: "expired" };
  }

  await record.update({ used: true });
  return { success: true, userId: record.user_id };
}
