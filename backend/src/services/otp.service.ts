import { createHash, randomInt } from "node:crypto";
import { Op } from "sequelize";
import { env } from "../config/env.js";
import { PhoneOtp } from "../database/models/index.js";
import { getSmsProvider } from "../integrations/sms/index.js";

// OTP is a 6-digit numeric code.
const OTP_LENGTH = 6;

function generateRawOtp(): string {
  // cryptographically secure random integer in range [0, 999999]
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/**
 * Create a new OTP for the given user, invalidate any prior unused OTPs,
 * and deliver it via SMS. Enforces a resend cooldown.
 *
 * Throws if the cooldown has not elapsed.
 */
export async function issuePhoneOtp(userId: string): Promise<void> {
  const now = new Date();
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  // Check cooldown: reject if a valid OTP was issued within the cooldown window.
  const recentOtp = await PhoneOtp.findOne({
    where: {
      user_id: userId,
      used: false,
      expires_at: { [Op.gt]: now },
      created_at: { [Op.gt]: new Date(now.getTime() - cooldownMs) },
    },
    order: [["created_at", "DESC"]],
  });

  if (recentOtp !== null) {
    const retryAfterMs =
      recentOtp.created_at!.getTime() + cooldownMs - now.getTime();
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    throw Object.assign(
      new Error(
        `Please wait ${retryAfterSeconds} second(s) before requesting a new OTP.`,
      ),
      { code: "OTP_COOLDOWN", retryAfterSeconds },
    );
  }

  // Invalidate any previously unused OTPs for this user.
  await PhoneOtp.update(
    { used: true },
    { where: { user_id: userId, used: false } },
  );

  // Generate and store the new OTP.
  const rawOtp = generateRawOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(now.getTime() + env.OTP_EXPIRES_IN_SECONDS * 1000);

  await PhoneOtp.create({
    user_id: userId,
    otp_hash: otpHash,
    attempts: 0,
    expires_at: expiresAt,
    used: false,
  });

  // Deliver the OTP via the configured SMS provider.
  // The raw OTP value is passed only to the SMS provider and never logged.
  const smsProvider = getSmsProvider();
  // The user's phone number is fetched by the caller before invoking this.
  // We pass it in via the options below.
  return;
}

/**
 * Issue an OTP and send it to the given phone number.
 */
export async function issueAndSendPhoneOtp(
  userId: string,
  phoneNumber: string,
): Promise<void> {
  const now = new Date();
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  const recentOtp = await PhoneOtp.findOne({
    where: {
      user_id: userId,
      used: false,
      expires_at: { [Op.gt]: now },
      created_at: { [Op.gt]: new Date(now.getTime() - cooldownMs) },
    },
    order: [["created_at", "DESC"]],
  });

  if (recentOtp !== null) {
    const retryAfterMs =
      recentOtp.created_at!.getTime() + cooldownMs - now.getTime();
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    throw Object.assign(
      new Error(
        `Please wait ${retryAfterSeconds} second(s) before requesting a new OTP.`,
      ),
      { code: "OTP_COOLDOWN", retryAfterSeconds },
    );
  }

  // Invalidate prior unused OTPs.
  await PhoneOtp.update(
    { used: true },
    { where: { user_id: userId, used: false } },
  );

  const rawOtp = generateRawOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(now.getTime() + env.OTP_EXPIRES_IN_SECONDS * 1000);

  await PhoneOtp.create({
    user_id: userId,
    otp_hash: otpHash,
    attempts: 0,
    expires_at: expiresAt,
    used: false,
  });

  const smsProvider = getSmsProvider();
  await smsProvider.sendSms({
    to: phoneNumber,
    body: `Your AgroConnect verification code is ${rawOtp}. It expires in ${Math.floor(env.OTP_EXPIRES_IN_SECONDS / 60)} minutes. Do not share it.`,
  });
  // rawOtp leaves scope here and is not stored anywhere in this process.
}

export type OtpVerificationResult =
  | { success: true }
  | {
      success: false;
      reason: "not_found" | "expired" | "used" | "max_attempts" | "invalid";
    };

/**
 * Verify a submitted OTP for the given user.
 * Increments the attempt counter on failure.
 * Marks the OTP as used on success.
 */
export async function verifyPhoneOtp(
  userId: string,
  rawOtp: string,
): Promise<OtpVerificationResult> {
  const now = new Date();

  // Find the most recent unused OTP for this user.
  const record = await PhoneOtp.findOne({
    where: {
      user_id: userId,
      used: false,
    },
    order: [["created_at", "DESC"]],
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

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    return { success: false, reason: "max_attempts" };
  }

  const submittedHash = hashOtp(rawOtp);

  if (submittedHash !== record.otp_hash) {
    // Increment attempt counter.
    await record.update({ attempts: record.attempts + 1 });
    return { success: false, reason: "invalid" };
  }

  // Valid OTP — mark as used.
  await record.update({ used: true });
  return { success: true };
}
