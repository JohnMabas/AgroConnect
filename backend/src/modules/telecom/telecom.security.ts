import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import type { TelecomChannel } from "./telecom.types.js";

function normalizeIp(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);
  return trimmed;
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => Number(part));
  if (
    numbers.some(
      (part) => !Number.isInteger(part) || part < 0 || part > 255,
    )
  ) {
    return null;
  }
  return (
    ((numbers[0]! << 24) >>> 0) +
    (numbers[1]! << 16) +
    (numbers[2]! << 8) +
    numbers[3]!
  );
}

function ipMatchesRule(ip: string, rule: string): boolean {
  const normalizedIp = normalizeIp(ip);
  const normalizedRule = rule.trim();
  if (!normalizedRule) return false;

  if (!normalizedRule.includes("/")) {
    return normalizedIp === normalizeIp(normalizedRule);
  }

  const [network, bitsRaw] = normalizedRule.split("/");
  const bits = Number(bitsRaw);
  if (!network || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }

  const ipNumber = ipv4ToNumber(normalizedIp);
  const networkNumber = ipv4ToNumber(network);
  if (ipNumber === null || networkNumber === null) return false;
  if (bits === 0) return true;

  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipNumber & mask) === (networkNumber & mask);
}

export function requestIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return normalizeIp(forwarded.split(",")[0]!.trim());
  }
  return normalizeIp(req.ip ?? req.socket.remoteAddress ?? "");
}

function channelSecret(channel: TelecomChannel): string | null {
  const specific =
    channel === "ussd"
      ? env.USSD_CALLBACK_SECRET
      : env.VOICE_CALLBACK_SECRET;
  return specific ?? env.TELECOM_CALLBACK_SECRET ?? null;
}

function extractSecret(req: Request): string | null {
  const querySecret = req.query.secret;
  if (typeof querySecret === "string" && querySecret.length > 0) {
    return querySecret;
  }

  const headers = [
    req.headers["x-telecom-callback-secret"],
    req.headers["x-ussd-callback-secret"],
    req.headers["x-voice-callback-secret"],
  ];
  for (const header of headers) {
    if (typeof header === "string" && header.length > 0) return header;
  }

  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token.length > 0) return token;
  }

  return null;
}

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function allowlist(): string[] {
  return (env.TELECOM_CALLBACK_IP_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function telecomChannelEnabled(
  channel: TelecomChannel,
): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!env.TELECOM_ENABLED) {
      res.status(503).json({
        success: false,
        error: { message: "Telecom service is disabled." },
      });
      return;
    }
    if (channel === "ussd" && !env.USSD_ENABLED) {
      res.status(503).json({
        success: false,
        error: { message: "USSD service is disabled." },
      });
      return;
    }
    if (channel === "voice" && !env.VOICE_ENABLED) {
      res.status(503).json({
        success: false,
        error: { message: "Voice service is disabled." },
      });
      return;
    }
    next();
  };
}

export function verifyTelecomCallback(
  channel: TelecomChannel,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const secret = channelSecret(channel);
    const isProduction = env.NODE_ENV === "production";

    if (!secret) {
      if (isProduction) {
        res.status(503).json({
          success: false,
          error: { message: "Telecom callback secret is not configured." },
        });
        return;
      }
    } else {
      const provided = extractSecret(req);
      if (!provided || !secretsMatch(provided, secret)) {
        res.status(401).json({
          success: false,
          error: { message: "Invalid telecom callback credentials." },
        });
        return;
      }
    }

    const rules = allowlist();
    if (rules.length > 0) {
      const ip = requestIp(req);
      if (!rules.some((rule) => ipMatchesRule(ip, rule))) {
        res.status(403).json({
          success: false,
          error: { message: "Telecom callback IP is not allowed." },
        });
        return;
      }
    }

    next();
  };
}

export function createTelecomRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: env.TELECOM_RATE_LIMIT_PER_MINUTE,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    keyGenerator: (req: Request): string => {
      const body = req.body as Record<string, unknown> | undefined;
      const phone =
        (typeof body?.phoneNumber === "string" && body.phoneNumber) ||
        (typeof body?.callerNumber === "string" && body.callerNumber);
      return phone ? `phone:${phone}` : `ip:${requestIp(req)}`;
    },
    message: {
      success: false,
      error: { message: "Too many telecom requests. Please try again shortly." },
    },
  });
}
