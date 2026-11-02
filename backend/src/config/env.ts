import dotenv from "dotenv";

// Vitest sets process.env.VITEST = "true" in every worker thread before any
// module is evaluated. Skipping dotenv here prevents the backend/.env file
// (which contains production DB_SSL_CA_PATH and DB_SSL=true) from overriding
// the test environment variables that vitest.config.ts injects. Outside of
// Vitest, dotenv loads .env as usual for local development and production.
if (!process.env.VITEST) {
  dotenv.config({ quiet: true });
}

export type NodeEnvironment = "development" | "test" | "production";

const NODE_ENVIRONMENTS: readonly NodeEnvironment[] = [
  "development",
  "test",
  "production",
];

function optionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function requireString(name: string, value: string | undefined): string {
  const v = optionalString(value);
  if (v === undefined) {
    throw new Error(
      `Required environment variable ${name} is missing or empty.`,
    );
  }
  return v;
}

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  const nodeEnv = optionalString(value) ?? "development";

  if (!NODE_ENVIRONMENTS.includes(nodeEnv as NodeEnvironment)) {
    throw new Error(
      `Invalid NODE_ENV environment variable: "${nodeEnv}". Expected development, test or production.`,
    );
  }

  return nodeEnv as NodeEnvironment;
}

function parsePort(value: string | undefined, fallback: number): number {
  const raw = optionalString(value);

  if (raw === undefined) {
    return fallback;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT environment variable: "${raw}"`);
  }

  return port;
}

function parseBoolean(
  name: string,
  value: string | undefined,
  fallback: boolean,
): boolean {
  const raw = optionalString(value)?.toLowerCase();

  if (raw === undefined) {
    return fallback;
  }

  if (["true", "1", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(raw)) {
    return false;
  }

  throw new Error(
    `Invalid ${name} environment variable: "${raw}". Expected true or false.`,
  );
}

function parseOptionalBoolean(
  name: string,
  value: string | undefined,
): boolean | undefined {
  return value === undefined ? undefined : parseBoolean(name, value, false);
}

function parsePositiveInt(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const raw = optionalString(value);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      `Invalid ${name} environment variable: "${raw}". Expected a positive integer.`,
    );
  }
  return n;
}

const NODE_ENV = parseNodeEnvironment(process.env.NODE_ENV);
const DATABASE_URL = optionalString(process.env.DATABASE_URL);
const DATABASE_URL_REQUESTS_SSL =
  DATABASE_URL !== undefined &&
  /[?&]sslmode=(require|verify-ca|verify-full)\b/i.test(DATABASE_URL);

export const env = Object.freeze({
  NODE_ENV,
  PORT: parsePort(process.env.PORT, 5000),
  FRONTEND_URL: optionalString(process.env.FRONTEND_URL),

  DATABASE_URL,
  DB_SSL: parseBoolean(
    "DB_SSL",
    process.env.DB_SSL,
    NODE_ENV === "production" || DATABASE_URL_REQUESTS_SSL,
  ),
  DB_SSL_CA_PATH: optionalString(process.env.DB_SSL_CA_PATH),
  DB_SSL_VERIFY: parseOptionalBoolean(
    "DB_SSL_VERIFY",
    process.env.DB_SSL_VERIFY,
  ),
  // When the connection host has been replaced with a resolved IPv4 address,
  // DB_SSL_SERVERNAME carries the original hostname for TLS SNI and certificate
  // verification. Set automatically by the server startup; never needed in .env.
  DB_SSL_SERVERNAME: optionalString(process.env.DB_SSL_SERVERNAME),

  DB_HOST: optionalString(process.env.DB_HOST),
  DB_PORT: parsePort(process.env.DB_PORT, 5432),
  DB_NAME: optionalString(process.env.DB_NAME),
  DB_USER: optionalString(process.env.DB_USER),
  DB_PASSWORD: process.env.DB_PASSWORD,

  DEFAULT_PHONE_COUNTRY:
    optionalString(process.env.DEFAULT_PHONE_COUNTRY)?.toUpperCase() ?? "NG",

  // ─── JWT ────────────────────────────────────────────────────────────────────
  // In development/test, fall back to insecure placeholder values so the app
  // starts without full configuration. In production, both secrets are required.
  JWT_ACCESS_SECRET:
    NODE_ENV === "production"
      ? requireString("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET)
      : (optionalString(process.env.JWT_ACCESS_SECRET) ??
        "dev-access-secret-change-in-production"),
  JWT_ACCESS_EXPIRES_IN:
    optionalString(process.env.JWT_ACCESS_EXPIRES_IN) ?? "15m",

  JWT_REFRESH_SECRET:
    NODE_ENV === "production"
      ? requireString("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET)
      : (optionalString(process.env.JWT_REFRESH_SECRET) ??
        "dev-refresh-secret-change-in-production"),
  JWT_REFRESH_EXPIRES_IN:
    optionalString(process.env.JWT_REFRESH_EXPIRES_IN) ?? "7d",

  // ─── OTP ────────────────────────────────────────────────────────────────────
  OTP_EXPIRES_IN_SECONDS: parsePositiveInt(
    "OTP_EXPIRES_IN_SECONDS",
    process.env.OTP_EXPIRES_IN_SECONDS,
    300, // 5 minutes
  ),
  OTP_RESEND_COOLDOWN_SECONDS: parsePositiveInt(
    "OTP_RESEND_COOLDOWN_SECONDS",
    process.env.OTP_RESEND_COOLDOWN_SECONDS,
    60, // 1 minute
  ),
  OTP_MAX_ATTEMPTS: parsePositiveInt(
    "OTP_MAX_ATTEMPTS",
    process.env.OTP_MAX_ATTEMPTS,
    5,
  ),

  // ─── Email verification ─────────────────────────────────────────────────────
  EMAIL_VERIFICATION_EXPIRES_IN_SECONDS: parsePositiveInt(
    "EMAIL_VERIFICATION_EXPIRES_IN_SECONDS",
    process.env.EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
    86400, // 24 hours
  ),

  // ─── SMS provider ────────────────────────────────────────────────────────────
  SMS_PROVIDER: optionalString(process.env.SMS_PROVIDER) ?? "dev",
  SMS_API_KEY: optionalString(process.env.SMS_API_KEY),
  SMS_SENDER_ID: optionalString(process.env.SMS_SENDER_ID) ?? "AgroConnect",

  // ─── Email provider ──────────────────────────────────────────────────────────
  EMAIL_PROVIDER: optionalString(process.env.EMAIL_PROVIDER) ?? "dev",
  EMAIL_HOST: optionalString(process.env.EMAIL_HOST),
  EMAIL_PORT: parsePort(process.env.EMAIL_PORT, 587),
  EMAIL_USER: optionalString(process.env.EMAIL_USER),
  EMAIL_PASSWORD: optionalString(process.env.EMAIL_PASSWORD),
  EMAIL_FROM:
    optionalString(process.env.EMAIL_FROM) ?? "noreply@agroconnect.app",
});

export type Environment = typeof env;
