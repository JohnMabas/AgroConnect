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

function parseAiProvider(value: string | undefined): "dev" | "openai_compatible" {
  const provider = optionalString(value) ?? "dev";
  if (provider !== "dev" && provider !== "openai_compatible") {
    throw new Error(
      `Invalid AI_PROVIDER environment variable: "${provider}". Expected dev or openai_compatible.`,
    );
  }
  return provider;
}

const NODE_ENV = parseNodeEnvironment(process.env.NODE_ENV);
const DATABASE_URL = optionalString(process.env.DATABASE_URL);
const DATABASE_URL_REQUESTS_SSL =
  DATABASE_URL !== undefined &&
  /[?&]sslmode=(require|verify-ca|verify-full)\b/i.test(DATABASE_URL);
const AI_PROVIDER = parseAiProvider(process.env.AI_PROVIDER);
const AI_API_KEY = optionalString(process.env.AI_API_KEY);
const AI_MODEL = optionalString(process.env.AI_MODEL);
const AI_BASE_URL =
  optionalString(process.env.AI_BASE_URL) ?? "https://api.openai.com/v1";

if (AI_PROVIDER === "openai_compatible") {
  requireString("AI_API_KEY", AI_API_KEY);
  requireString("AI_MODEL", AI_MODEL);
}

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
  // Supported values: "dev" (console log), "africastalking".
  // "dev" is the default and must not be used in production.
  SMS_PROVIDER: optionalString(process.env.SMS_PROVIDER) ?? "dev",

  // Legacy generic key — kept for backward compatibility with existing code.
  SMS_API_KEY: optionalString(process.env.SMS_API_KEY),
  SMS_SENDER_ID: optionalString(process.env.SMS_SENDER_ID) ?? "AgroConnect",

  // ─── Africa's Talking credentials ────────────────────────────────────────────
  // Required when SMS_PROVIDER=africastalking.
  // Use AFRICASTALKING_USERNAME="sandbox" and the sandbox API key for testing.
  // Left empty in development — the app warns on first send attempt rather
  // than crashing at startup, so local development is not blocked.
  AFRICASTALKING_USERNAME: optionalString(process.env.AFRICASTALKING_USERNAME),
  AFRICASTALKING_API_KEY: optionalString(process.env.AFRICASTALKING_API_KEY),
  // Registered alphanumeric sender ID. Optional — omit for the shared shortcode.
  AFRICASTALKING_SENDER_ID: optionalString(process.env.AFRICASTALKING_SENDER_ID),

  // ─── Telecom: USSD, Voice/IVR and rural access ──────────────────────────────
  // Phase 17 is disabled only when explicitly turned off. The provider is
  // Africa's Talking for both USSD and voice callbacks.
  TELECOM_ENABLED: parseBoolean(
    "TELECOM_ENABLED",
    process.env.TELECOM_ENABLED,
    true,
  ),
  USSD_ENABLED: parseBoolean(
    "USSD_ENABLED",
    process.env.USSD_ENABLED,
    true,
  ),
  VOICE_ENABLED: parseBoolean(
    "VOICE_ENABLED",
    process.env.VOICE_ENABLED,
    true,
  ),
  AFRICASTALKING_ENVIRONMENT:
    optionalString(process.env.AFRICASTALKING_ENVIRONMENT) ?? "sandbox",
  USSD_SERVICE_CODE: optionalString(process.env.USSD_SERVICE_CODE),
  USSD_CALLBACK_SECRET: optionalString(process.env.USSD_CALLBACK_SECRET),
  VOICE_NUMBER: optionalString(process.env.VOICE_NUMBER),
  VOICE_CALLBACK_URL: optionalString(process.env.VOICE_CALLBACK_URL),
  VOICE_CALLBACK_SECRET: optionalString(process.env.VOICE_CALLBACK_SECRET),
  // Shared fallback when separate USSD/Voice secrets are not configured.
  TELECOM_CALLBACK_SECRET: optionalString(process.env.TELECOM_CALLBACK_SECRET),
  // Comma-separated IPv4 addresses or CIDR ranges. Empty means no IP filter.
  TELECOM_CALLBACK_IP_ALLOWLIST: optionalString(
    process.env.TELECOM_CALLBACK_IP_ALLOWLIST,
  ),
  TELECOM_SESSION_TTL_SECONDS: parsePositiveInt(
    "TELECOM_SESSION_TTL_SECONDS",
    process.env.TELECOM_SESSION_TTL_SECONDS,
    180,
  ),
  TELECOM_DUPLICATE_WINDOW_SECONDS: parsePositiveInt(
    "TELECOM_DUPLICATE_WINDOW_SECONDS",
    process.env.TELECOM_DUPLICATE_WINDOW_SECONDS,
    10,
  ),
  TELECOM_MAX_MENU_OPTIONS: parsePositiveInt(
    "TELECOM_MAX_MENU_OPTIONS",
    process.env.TELECOM_MAX_MENU_OPTIONS,
    8,
  ),
  TELECOM_SUPPORT_MESSAGE_MAX_LENGTH: parsePositiveInt(
    "TELECOM_SUPPORT_MESSAGE_MAX_LENGTH",
    process.env.TELECOM_SUPPORT_MESSAGE_MAX_LENGTH,
    500,
  ),
  TELECOM_RATE_LIMIT_PER_MINUTE: parsePositiveInt(
    "TELECOM_RATE_LIMIT_PER_MINUTE",
    process.env.TELECOM_RATE_LIMIT_PER_MINUTE,
    60,
  ),
  USSD_MAX_RESPONSE_LENGTH: parsePositiveInt(
    "USSD_MAX_RESPONSE_LENGTH",
    process.env.USSD_MAX_RESPONSE_LENGTH,
    182,
  ),

  // ─── Localization ───────────────────────────────────────────────────────────
  LOCALIZATION_DEFAULT_LANGUAGE:
    optionalString(process.env.LOCALIZATION_DEFAULT_LANGUAGE) ?? "en",
  LOCALIZATION_SUPPORTED_LANGUAGES:
    optionalString(process.env.LOCALIZATION_SUPPORTED_LANGUAGES) ??
    "en,ha,ig,yo,pcm",
  // Languages whose translations have had human review. Critical messages in
  // all other languages fall back to English.
  LOCALIZATION_REVIEWED_LANGUAGES:
    optionalString(process.env.LOCALIZATION_REVIEWED_LANGUAGES) ?? "en",

  // ─── Email provider ──────────────────────────────────────────────────────────
  // Supported values: "dev" (console log), "brevo", "smtp".
  // "dev" is the default and must not be used in production.
  EMAIL_PROVIDER: optionalString(process.env.EMAIL_PROVIDER) ?? "dev",
  EMAIL_FROM:
    optionalString(process.env.EMAIL_FROM) ?? "noreply@agroconnect.app",

  // ─── Brevo (transactional email) credentials ─────────────────────────────────
  // Required when EMAIL_PROVIDER=brevo.
  // API key: https://app.brevo.com/settings/keys/api
  // BREVO_SENDER_EMAIL must be a verified sender in your Brevo account.
  // Left empty in development — the app warns on first send attempt rather
  // than crashing at startup, so local development is not blocked.
  BREVO_API_KEY: optionalString(process.env.BREVO_API_KEY),
  BREVO_SENDER_EMAIL: optionalString(process.env.BREVO_SENDER_EMAIL),
  BREVO_SENDER_NAME:
    optionalString(process.env.BREVO_SENDER_NAME) ?? "AgroConnect",

  // ─── SMTP credentials (alternative email provider) ───────────────────────────
  // Used when EMAIL_PROVIDER=smtp.
  EMAIL_HOST: optionalString(process.env.EMAIL_HOST),
  EMAIL_PORT: parsePort(process.env.EMAIL_PORT, 587),
  EMAIL_USER: optionalString(process.env.EMAIL_USER),
  EMAIL_PASSWORD: optionalString(process.env.EMAIL_PASSWORD),

  // ─── OTP configuration ───────────────────────────────────────────────────────
  // OTP_LENGTH: number of digits in the generated OTP. Default: 6.
  OTP_LENGTH: parsePositiveInt("OTP_LENGTH", process.env.OTP_LENGTH, 6),

  // ─── Produce image storage ───────────────────────────────────────────────────
  // Local filesystem adapter used while no object-storage service is
  // configured. Production must use an object-storage adapter instead.
  UPLOAD_STORAGE_PATH:
    optionalString(process.env.UPLOAD_STORAGE_PATH) ?? "uploads",
  UPLOAD_PUBLIC_PREFIX:
    optionalString(process.env.UPLOAD_PUBLIC_PREFIX) ?? "/uploads",
  UPLOAD_MAX_FILE_SIZE_BYTES: parsePositiveInt(
    "UPLOAD_MAX_FILE_SIZE_BYTES",
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
    5 * 1024 * 1024, // 5 MiB
  ),
  UPLOAD_MAX_IMAGES_PER_LISTING: parsePositiveInt(
    "UPLOAD_MAX_IMAGES_PER_LISTING",
    process.env.UPLOAD_MAX_IMAGES_PER_LISTING,
    5,
  ),

  // ─── Orders and inventory reservations ──────────────────────────────────────
  ORDER_RESERVATION_MINUTES: parsePositiveInt(
    "ORDER_RESERVATION_MINUTES",
    process.env.ORDER_RESERVATION_MINUTES,
    30,
  ),
  // Interval for the background reservation-expiry sweep. Default: 60 seconds.
  ORDER_RESERVATION_SWEEP_INTERVAL_SECONDS: parsePositiveInt(
    "ORDER_RESERVATION_SWEEP_INTERVAL_SECONDS",
    process.env.ORDER_RESERVATION_SWEEP_INTERVAL_SECONDS,
    60,
  ),

  // ─── Paystack ───────────────────────────────────────────────────────────────
  // Secrets are optional at startup so local development and tests can boot
  // without provider credentials. Payment endpoints return a configuration
  // error until a secret key is supplied. Never expose these to the frontend.
  PAYSTACK_SECRET_KEY: optionalString(process.env.PAYSTACK_SECRET_KEY),
  PAYSTACK_PUBLIC_KEY: optionalString(process.env.PAYSTACK_PUBLIC_KEY),
  PAYSTACK_BASE_URL:
    optionalString(process.env.PAYSTACK_BASE_URL) ?? "https://api.paystack.co",
  PAYSTACK_CALLBACK_URL: optionalString(process.env.PAYSTACK_CALLBACK_URL),
  PAYSTACK_WEBHOOK_SIGNING_SECRET: optionalString(
    process.env.PAYSTACK_WEBHOOK_SIGNING_SECRET,
  ),
  PAYSTACK_CURRENCY:
    optionalString(process.env.PAYSTACK_CURRENCY)?.toUpperCase() ?? "NGN",
  PAYSTACK_MODE:
    optionalString(process.env.PAYSTACK_MODE) ??
    (NODE_ENV === "production" ? "live" : "test"),
  PAYSTACK_REQUEST_TIMEOUT_MS: parsePositiveInt(
    "PAYSTACK_REQUEST_TIMEOUT_MS",
    process.env.PAYSTACK_REQUEST_TIMEOUT_MS,
    15_000,
  ),

  // ─── Notifications ──────────────────────────────────────────────────────────
  // Applies to email and SMS delivery attempts. In-app notifications are
  // persisted immediately and are not retried.
  NOTIFICATION_MAX_RETRIES: parsePositiveInt(
    "NOTIFICATION_MAX_RETRIES",
    process.env.NOTIFICATION_MAX_RETRIES,
    5,
  ),
  // Base delay for exponential backoff between failed delivery attempts.
  NOTIFICATION_RETRY_INTERVAL_SECONDS: parsePositiveInt(
    "NOTIFICATION_RETRY_INTERVAL_SECONDS",
    process.env.NOTIFICATION_RETRY_INTERVAL_SECONDS,
    60,
  ),
  // Interval for the in-process notification retry/warning worker.
  NOTIFICATION_WORKER_INTERVAL_SECONDS: parsePositiveInt(
    "NOTIFICATION_WORKER_INTERVAL_SECONDS",
    process.env.NOTIFICATION_WORKER_INTERVAL_SECONDS,
    30,
  ),
  // How long before reservation expiry the buyer receives a warning.
  NOTIFICATION_RESERVATION_WARNING_MINUTES: parsePositiveInt(
    "NOTIFICATION_RESERVATION_WARNING_MINUTES",
    process.env.NOTIFICATION_RESERVATION_WARNING_MINUTES,
    10,
  ),
  // Hard timeout for an individual email/SMS provider call.
  NOTIFICATION_PROVIDER_TIMEOUT_SECONDS: parsePositiveInt(
    "NOTIFICATION_PROVIDER_TIMEOUT_SECONDS",
    process.env.NOTIFICATION_PROVIDER_TIMEOUT_SECONDS,
    15,
  ),

  // ─── Reviews and reports ────────────────────────────────────────────────────
  // How long a reviewer may edit their own review after creation.
  REVIEW_EDIT_WINDOW_MINUTES: parsePositiveInt(
    "REVIEW_EDIT_WINDOW_MINUTES",
    process.env.REVIEW_EDIT_WINDOW_MINUTES,
    24 * 60,
  ),
  REVIEW_TITLE_MAX_LENGTH: parsePositiveInt(
    "REVIEW_TITLE_MAX_LENGTH",
    process.env.REVIEW_TITLE_MAX_LENGTH,
    120,
  ),
  REVIEW_COMMENT_MAX_LENGTH: parsePositiveInt(
    "REVIEW_COMMENT_MAX_LENGTH",
    process.env.REVIEW_COMMENT_MAX_LENGTH,
    2_000,
  ),
  REPORT_DESCRIPTION_MAX_LENGTH: parsePositiveInt(
    "REPORT_DESCRIPTION_MAX_LENGTH",
    process.env.REPORT_DESCRIPTION_MAX_LENGTH,
    1_000,
  ),

  // ─── Verification documents ─────────────────────────────────────────────────
  // Private storage root. This directory must never be served publicly.
  VERIFICATION_DOCUMENT_STORAGE_PATH:
    optionalString(process.env.VERIFICATION_DOCUMENT_STORAGE_PATH) ??
    "private-uploads",
  VERIFICATION_DOCUMENT_MAX_FILE_SIZE_BYTES: parsePositiveInt(
    "VERIFICATION_DOCUMENT_MAX_FILE_SIZE_BYTES",
    process.env.VERIFICATION_DOCUMENT_MAX_FILE_SIZE_BYTES,
    10 * 1024 * 1024, // 10 MiB
  ),
  // Pending verification requests expire after this many days.
  VERIFICATION_REQUEST_EXPIRY_DAYS: parsePositiveInt(
    "VERIFICATION_REQUEST_EXPIRY_DAYS",
    process.env.VERIFICATION_REQUEST_EXPIRY_DAYS,
    30,
  ),

  // ─── Market intelligence and analytics ──────────────────────────────────────
  MARKET_DEFAULT_CURRENCY:
    optionalString(process.env.MARKET_DEFAULT_CURRENCY)?.toUpperCase() ??
    "NGN",
  MARKET_ANALYTICS_DEFAULT_WINDOW_DAYS: parsePositiveInt(
    "MARKET_ANALYTICS_DEFAULT_WINDOW_DAYS",
    process.env.MARKET_ANALYTICS_DEFAULT_WINDOW_DAYS,
    90,
  ),
  MARKET_OBSERVATION_MAX_AGE_DAYS: parsePositiveInt(
    "MARKET_OBSERVATION_MAX_AGE_DAYS",
    process.env.MARKET_OBSERVATION_MAX_AGE_DAYS,
    365,
  ),
  MARKET_INSIGHT_PRICE_CHANGE_THRESHOLD_PERCENT: parsePositiveInt(
    "MARKET_INSIGHT_PRICE_CHANGE_THRESHOLD_PERCENT",
    process.env.MARKET_INSIGHT_PRICE_CHANGE_THRESHOLD_PERCENT,
    10,
  ),
  MARKET_INSIGHT_SUPPLY_DEMAND_GAP_PERCENT: parsePositiveInt(
    "MARKET_INSIGHT_SUPPLY_DEMAND_GAP_PERCENT",
    process.env.MARKET_INSIGHT_SUPPLY_DEMAND_GAP_PERCENT,
    25,
  ),
  MARKET_INSIGHT_MIN_OBSERVATIONS: parsePositiveInt(
    "MARKET_INSIGHT_MIN_OBSERVATIONS",
    process.env.MARKET_INSIGHT_MIN_OBSERVATIONS,
    3,
  ),
  MARKET_INSIGHT_LOOKBACK_DAYS: parsePositiveInt(
    "MARKET_INSIGHT_LOOKBACK_DAYS",
    process.env.MARKET_INSIGHT_LOOKBACK_DAYS,
    30,
  ),
  MARKET_INSIGHT_EXPIRY_DAYS: parsePositiveInt(
    "MARKET_INSIGHT_EXPIRY_DAYS",
    process.env.MARKET_INSIGHT_EXPIRY_DAYS,
    30,
  ),

  // ─── AI assistance, recommendations and integrity ───────────────────────────
  // "dev" performs no external calls and uses deterministic fallbacks.
  // "openai_compatible" requires AI_API_KEY and AI_MODEL at startup.
  AI_PROVIDER,
  AI_API_KEY,
  AI_BASE_URL,
  AI_MODEL,
  AI_REQUEST_TIMEOUT_MS: parsePositiveInt(
    "AI_REQUEST_TIMEOUT_MS",
    process.env.AI_REQUEST_TIMEOUT_MS,
    20_000,
  ),
  AI_MAX_INPUT_LENGTH: parsePositiveInt(
    "AI_MAX_INPUT_LENGTH",
    process.env.AI_MAX_INPUT_LENGTH,
    4_000,
  ),
  AI_MAX_OUTPUT_TOKENS: parsePositiveInt(
    "AI_MAX_OUTPUT_TOKENS",
    process.env.AI_MAX_OUTPUT_TOKENS,
    1_000,
  ),
  AI_RATE_LIMIT_PER_MINUTE: parsePositiveInt(
    "AI_RATE_LIMIT_PER_MINUTE",
    process.env.AI_RATE_LIMIT_PER_MINUTE,
    30,
  ),
  AI_DAILY_USER_LIMIT: parsePositiveInt(
    "AI_DAILY_USER_LIMIT",
    process.env.AI_DAILY_USER_LIMIT,
    100,
  ),
  AI_ASSISTANT_ENABLED: parseBoolean(
    "AI_ASSISTANT_ENABLED",
    process.env.AI_ASSISTANT_ENABLED,
    true,
  ),
  AI_RECOMMENDATIONS_ENABLED: parseBoolean(
    "AI_RECOMMENDATIONS_ENABLED",
    process.env.AI_RECOMMENDATIONS_ENABLED,
    true,
  ),
  AI_INTEGRITY_ENABLED: parseBoolean(
    "AI_INTEGRITY_ENABLED",
    process.env.AI_INTEGRITY_ENABLED,
    true,
  ),
  AI_KNOWLEDGE_SEARCH_LIMIT: parsePositiveInt(
    "AI_KNOWLEDGE_SEARCH_LIMIT",
    process.env.AI_KNOWLEDGE_SEARCH_LIMIT,
    5,
  ),
  AI_CONVERSATION_CONTEXT_LIMIT: parsePositiveInt(
    "AI_CONVERSATION_CONTEXT_LIMIT",
    process.env.AI_CONVERSATION_CONTEXT_LIMIT,
    10,
  ),
});

export type Environment = typeof env;
