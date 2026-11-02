import dotenv from "dotenv";

dotenv.config({ quiet: true });

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

const NODE_ENV = parseNodeEnvironment(process.env.NODE_ENV);
const DATABASE_URL = optionalString(process.env.DATABASE_URL);
const DATABASE_URL_REQUESTS_SSL =
  DATABASE_URL !== undefined && /[?&]sslmode=(require|verify-ca|verify-full)\b/i.test(DATABASE_URL);

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

  DB_HOST: optionalString(process.env.DB_HOST),
  DB_PORT: parsePort(process.env.DB_PORT, 5432),
  DB_NAME: optionalString(process.env.DB_NAME),
  DB_USER: optionalString(process.env.DB_USER),
  DB_PASSWORD: process.env.DB_PASSWORD,

  DEFAULT_PHONE_COUNTRY:
    optionalString(process.env.DEFAULT_PHONE_COUNTRY)?.toUpperCase() ?? "NG",
});

export type Environment = typeof env;
