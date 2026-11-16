import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Op } from "sequelize";
import { env } from "../config/env.js";
import {
  PasswordResetToken,
  RefreshToken,
  User,
  UserPassword,
  sequelize,
} from "../database/models/index.js";
import { getEmailProvider } from "../integrations/email/index.js";
import { getSmsProvider } from "../integrations/sms/index.js";

const RESET_CODE_LENGTH = 6;

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(RESET_CODE_LENGTH, "0");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function hashesMatch(submittedHash: string, storedHash: string): boolean {
  const submitted = Buffer.from(submittedHash, "hex");
  const stored = Buffer.from(storedHash, "hex");
  return submitted.length === stored.length && timingSafeEqual(submitted, stored);
}

async function sendResetEmail(email: string, code: string): Promise<void> {
  const expiryMinutes = Math.max(
    1,
    Math.round(env.PASSWORD_RESET_EXPIRES_IN_SECONDS / 60),
  );
  const text =
    `Your AgroConnect Password Reset Code\n\n` +
    `Use the code below to reset your password:\n\n` +
    `${code}\n\n` +
    `This code expires in ${expiryMinutes} minutes. Do not share it with anyone.\n\n` +
    `If you did not request a password reset, you can ignore this email.`;
  const html =
    `<h1 style="font-size:20px;color:#102a43;">Your AgroConnect Password Reset Code</h1>` +
    `<p>Use the code below to reset your password:</p>` +
    `<p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#102a43;">${code}</p>` +
    `<p>This code expires in ${expiryMinutes} minutes. Do not share it with anyone.</p>` +
    `<p>If you did not request a password reset, you can ignore this email.</p>`;

  await getEmailProvider().sendEmail({
    to: email,
    subject: "Reset your AgroConnect password",
    text,
    html,
  });
}

async function sendResetSms(phoneNumber: string, code: string): Promise<void> {
  const expiryMinutes = Math.max(
    1,
    Math.round(env.PASSWORD_RESET_EXPIRES_IN_SECONDS / 60),
  );
  await getSmsProvider().sendSms({
    to: phoneNumber,
    body: `Your AgroConnect password reset code is ${code}. It expires in ${expiryMinutes} minutes. Do not share it.`,
  });
}

export async function issuePasswordResetCode(user: User): Promise<void> {
  const now = new Date();
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  const recent = await PasswordResetToken.findOne({
    where: {
      user_id: user.id,
      used: false,
      expires_at: { [Op.gt]: now },
      created_at: { [Op.gt]: new Date(now.getTime() - cooldownMs) },
    },
    order: [["created_at", "DESC"]],
  });

  if (recent !== null) {
    const retryAfterMs =
      recent.created_at!.getTime() + cooldownMs - now.getTime();
    throw Object.assign(
      new Error(
        `Please wait ${Math.ceil(retryAfterMs / 1000)} second(s) before requesting another reset code.`,
      ),
      { code: "PASSWORD_RESET_COOLDOWN", retryAfterSeconds: Math.ceil(retryAfterMs / 1000) },
    );
  }

  await PasswordResetToken.destroy({
    where: { user_id: user.id, used: false },
  });

  const code = generateCode();
  const email = user.email;
  const phoneNumber = user.email ? null : user.phone_number;

  if (!email && !phoneNumber) {
    throw Object.assign(
      new Error("This account has no email address or phone number."),
      { code: "PASSWORD_RESET_UNAVAILABLE" },
    );
  }

  const expiresAt = new Date(
    now.getTime() + env.PASSWORD_RESET_EXPIRES_IN_SECONDS * 1000,
  );

  const record = await PasswordResetToken.create({
    user_id: user.id,
    email,
    phone_number: phoneNumber,
    token_hash: hashCode(code),
    attempts: 0,
    expires_at: expiresAt,
    used: false,
  });

  try {
    if (email) {
      await sendResetEmail(email, code);
    } else if (phoneNumber) {
      await sendResetSms(phoneNumber, code);
    }
  } catch (error) {
    await PasswordResetToken.destroy({ where: { id: record.id } });
    throw error;
  }
}

export type PasswordResetVerificationResult =
  | { success: true }
  | {
      success: false;
      reason: "not_found" | "expired" | "used" | "max_attempts" | "invalid";
    };

export async function resetPasswordWithCode(
  userId: string,
  rawCode: string,
  passwordHash: string,
): Promise<PasswordResetVerificationResult> {
  const now = new Date();

  const record = await PasswordResetToken.findOne({
    where: { user_id: userId },
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

  if (record.attempts >= env.PASSWORD_RESET_MAX_ATTEMPTS) {
    return { success: false, reason: "max_attempts" };
  }

  if (!hashesMatch(hashCode(rawCode), record.token_hash)) {
    await record.update({ attempts: record.attempts + 1 });
    return { success: false, reason: "invalid" };
  }

  await sequelize.transaction(async (transaction) => {
    await record.update({ used: true }, { transaction });
    const existing = await UserPassword.findOne({
      where: { user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      await existing.update({ hash: passwordHash }, { transaction });
    } else {
      await UserPassword.create(
        { user_id: userId, hash: passwordHash },
        { transaction },
      );
    }
    await RefreshToken.update(
      { revoked: true },
      { where: { user_id: userId, revoked: false }, transaction },
    );
  });

  return { success: true };
}
