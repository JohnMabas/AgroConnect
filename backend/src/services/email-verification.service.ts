import { createHash, randomBytes } from "node:crypto";
import { Op } from "sequelize";
import { env } from "../config/env.js";
import { EmailVerificationToken } from "../database/models/index.js";
import { getEmailProvider } from "../integrations/email/index.js";

function generateRawToken(): string {
  // 32 random bytes → 64-character hex string. This provides 256 bits of entropy.
  return randomBytes(32).toString("hex");
}

export function hashEmailToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issue an email verification token and send it to the given address.
 * Enforces a resend cooldown to prevent abuse.
 *
 * Returns the raw token (for use in the verification URL) — only in dev/test.
 * In production the token is only delivered by email; it is never returned.
 */
export async function issueEmailVerificationToken(
  userId: string,
  emailAddress: string,
): Promise<void> {
  const now = new Date();
  // Reuse the OTP resend cooldown for email verification resends.
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  const recentToken = await EmailVerificationToken.findOne({
    where: {
      user_id: userId,
      used: false,
      expires_at: { [Op.gt]: now },
      created_at: { [Op.gt]: new Date(now.getTime() - cooldownMs) },
    },
    order: [["created_at", "DESC"]],
  });

  if (recentToken !== null) {
    const retryAfterMs =
      recentToken.created_at!.getTime() + cooldownMs - now.getTime();
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    throw Object.assign(
      new Error(
        `Please wait ${retryAfterSeconds} second(s) before requesting a new verification email.`,
      ),
      { code: "EMAIL_VERIFY_COOLDOWN", retryAfterSeconds },
    );
  }

  // Invalidate prior unused tokens. Only successfully consumed tokens may
  // have used = true, so invalidated records are deleted.
  await EmailVerificationToken.destroy({
    where: { user_id: userId, used: false },
  });

  const rawToken = generateRawToken();
  const tokenHash = hashEmailToken(rawToken);
  const expiresAt = new Date(
    now.getTime() + env.EMAIL_VERIFICATION_EXPIRES_IN_SECONDS * 1000,
  );

  await EmailVerificationToken.create({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used: false,
  });

  const verificationUrl = `${env.FRONTEND_URL ?? "http://localhost:3000"}/verify-email?token=${rawToken}`;

  const emailProvider = getEmailProvider();
  await emailProvider.sendEmail({
    to: emailAddress,
    subject: "Verify your AgroConnect email address",
    text:
      `Welcome to AgroConnect!\n\n` +
      `Please verify your email address by clicking the link below:\n\n` +
      `${verificationUrl}\n\n` +
      `Alternatively, enter this code on the verification page: ${rawToken}\n\n` +
      `This link expires in ${Math.floor(env.EMAIL_VERIFICATION_EXPIRES_IN_SECONDS / 3600)} hour(s).\n\n` +
      `If you did not create an AgroConnect account, you can ignore this email.`,
    html:
      `<p>Welcome to <strong>AgroConnect</strong>!</p>` +
      `<p>Please verify your email address:</p>` +
      `<p><a href="${verificationUrl}">Verify email address</a></p>` +
      `<p>Or enter this code on the verification page:</p>` +
      `<p><code>${rawToken}</code></p>` +
      `<p>This link expires in ${Math.floor(env.EMAIL_VERIFICATION_EXPIRES_IN_SECONDS / 3600)} hour(s).</p>` +
      `<p>If you did not create an AgroConnect account, you can ignore this email.</p>`,
  });
  // rawToken leaves scope here and is not returned or stored in this process.
}

export type EmailTokenVerificationResult =
  | { success: true; userId: string }
  | {
      success: false;
      reason: "not_found" | "expired" | "used";
    };

/**
 * Verify an email verification token.
 * Marks it as used if valid.
 */
export async function verifyEmailToken(
  rawToken: string,
): Promise<EmailTokenVerificationResult> {
  const tokenHash = hashEmailToken(rawToken);
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
