import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { env } from "../config/env.js";
import { RefreshToken } from "../database/models/index.js";

// ─── Access token ────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string; // user ID
  roles: string[];
}

/**
 * Sign a short-lived access token.
 * Never log the returned string.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: "agroconnect",
    audience: "agroconnect-api",
  });
}

/**
 * Verify and decode an access token.
 * Returns the payload or throws a JsonWebTokenError / TokenExpiredError.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "agroconnect",
    audience: "agroconnect-api",
  }) as jwt.JwtPayload & AccessTokenPayload;

  return { sub: payload.sub as string, roles: payload.roles };
}

// ─── Refresh token ────────────────────────────────────────────────────────────

function generateRawRefreshToken(): string {
  return randomBytes(40).toString("hex"); // 320 bits of entropy
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseRefreshExpiry(): Date {
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN: "${raw}"`);
  }
  const amount = parseInt(match[1] ?? "7", 10);
  const unit = match[2] ?? "d";
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  const seconds = amount * (multipliers[unit] ?? 86400);
  return new Date(Date.now() + seconds * 1000);
}

/**
 * Issue a new refresh token for the given user.
 * Stores only the hash in the database.
 * Returns the raw token to be sent to the client as an HttpOnly cookie.
 */
export async function issueRefreshToken(
  userId: string,
  userAgent?: string,
): Promise<string> {
  const rawToken = generateRawRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = parseRefreshExpiry();

  await RefreshToken.create({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    revoked: false,
    user_agent: userAgent ?? null,
  });

  return rawToken;
}

export type RefreshResult =
  | {
      success: true;
      accessToken: string;
      refreshToken: string;
      userId: string;
      roles: string[];
    }
  | { success: false; reason: "not_found" | "expired" | "revoked" | "reuse_detected" };

/**
 * Rotate a refresh token:
 * 1. Look up the token hash in the database.
 * 2. If found and valid, revoke it and issue a new one.
 * 3. If the token was already revoked (reuse), revoke ALL tokens for the user.
 *
 * Returns new access + refresh tokens on success.
 */
export async function rotateRefreshToken(
  rawToken: string,
  roles: string[],
  userAgent?: string,
): Promise<RefreshResult> {
  const tokenHash = hashRefreshToken(rawToken);
  const now = new Date();

  const record = await RefreshToken.findOne({ where: { token_hash: tokenHash } });

  if (record === null) {
    return { success: false, reason: "not_found" };
  }

  if (record.revoked) {
    // Possible token reuse — revoke all sessions for this user as a precaution.
    await RefreshToken.update(
      { revoked: true },
      { where: { user_id: record.user_id, revoked: false } },
    );
    return { success: false, reason: "reuse_detected" };
  }

  if (record.expires_at <= now) {
    return { success: false, reason: "expired" };
  }

  const userId = record.user_id;

  // Revoke the current token.
  await record.update({ revoked: true });

  // Issue replacement tokens.
  const newRawRefreshToken = await issueRefreshToken(userId, userAgent);
  const accessToken = signAccessToken({ sub: userId, roles });

  return {
    success: true,
    accessToken,
    refreshToken: newRawRefreshToken,
    userId,
    roles,
  };
}

/**
 * Revoke a single refresh token (logout from current device).
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  await RefreshToken.update(
    { revoked: true },
    { where: { token_hash: tokenHash } },
  );
}

/**
 * Revoke all refresh tokens for a user (logout from all devices).
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await RefreshToken.update(
    { revoked: true },
    { where: { user_id: userId, revoked: false } },
  );
}

/**
 * Delete expired refresh tokens older than 30 days (housekeeping).
 */
export async function pruneExpiredRefreshTokens(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await RefreshToken.destroy({
    where: { expires_at: { [Op.lt]: cutoff } },
  });
}
