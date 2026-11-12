import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    testTimeout: 240_000, // multi-step USSD flows against a high-latency Aiven DB
    hookTimeout: 1_800_000, // migrations can take 10+ minutes on a cold Aiven connection
    // Vitest automatically sets VITEST=true in all worker threads before any
    // module is evaluated. env.ts checks for this flag and skips dotenv, so the
    // backend/.env file (which has DB_SSL=true and a DB_SSL_CA_PATH for Aiven)
    // is not loaded during tests. The values below are the baseline test env.
    // Tests may further override these values in their own setup.
    env: {
      NODE_ENV: "test",
      DB_SSL: "false",
      SMS_PROVIDER: "dev",
      EMAIL_PROVIDER: "dev",
      PAYSTACK_SECRET_KEY: "sk_test_phase9",
      PAYSTACK_WEBHOOK_SIGNING_SECRET: "whsec_phase9",
      PAYSTACK_CURRENCY: "NGN",
      PAYSTACK_CALLBACK_URL: "http://localhost:3000/payment/callback",
      VERIFICATION_DOCUMENT_STORAGE_PATH: "private-uploads-test",
      TELECOM_ENABLED: "true",
      USSD_ENABLED: "true",
      VOICE_ENABLED: "true",
      TELECOM_DUPLICATE_WINDOW_SECONDS: "3600",
      LOCALIZATION_SUPPORTED_LANGUAGES: "en,ha,ig,yo,pcm",
      LOCALIZATION_REVIEWED_LANGUAGES: "en",
    },
  },
});
