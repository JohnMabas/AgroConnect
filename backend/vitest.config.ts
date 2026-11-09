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
    testTimeout: 90_000,  // generous timeout for Aiven cold connections
    hookTimeout: 600_000, // migrations can take several minutes on a cold Aiven connection
    // Vitest automatically sets VITEST=true in all worker threads before any
    // module is evaluated. env.ts checks for this flag and skips dotenv, so the
    // backend/.env file (which has DB_SSL=true and a DB_SSL_CA_PATH for Aiven)
    // is not loaded during tests. The values below are the baseline test env.
    // Tests may further override these values in their own setup.
    env: {
      NODE_ENV: "test",
      DB_SSL: "false",
      PAYSTACK_SECRET_KEY: "sk_test_phase9",
      PAYSTACK_WEBHOOK_SIGNING_SECRET: "whsec_phase9",
      PAYSTACK_CURRENCY: "NGN",
      PAYSTACK_CALLBACK_URL: "http://localhost:3000/payment/callback",
      VERIFICATION_DOCUMENT_STORAGE_PATH: "private-uploads-test",
    },
  },
});
