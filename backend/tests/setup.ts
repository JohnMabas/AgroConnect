import { afterAll } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined || testDatabaseUrl.trim() === "") {
  throw new Error(
    "TEST_DATABASE_URL is required to run the AgroConnect database tests. Point it at an isolated PostgreSQL test database.",
  );
}

let databaseName: string;

try {
  const parsed = new URL(testDatabaseUrl);
  databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
} catch {
  throw new Error("TEST_DATABASE_URL is not a valid PostgreSQL URL.");
}

if (!/test/i.test(databaseName)) {
  throw new Error(
    'Refusing to run destructive database tests because the TEST_DATABASE_URL database name does not include "test".',
  );
}

const testDatabaseSsl = process.env.TEST_DB_SSL ?? "false";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DB_SSL = testDatabaseSsl;
process.env.DEFAULT_PHONE_COUNTRY = "NG";

delete process.env.DB_HOST;
delete process.env.DB_NAME;
delete process.env.DB_USER;
delete process.env.DB_PASSWORD;

if (testDatabaseSsl !== "true") {
  delete process.env.DB_SSL_CA_PATH;
  delete process.env.DB_SSL_VERIFY;
}

afterAll(async () => {
  const { closeDatabase } = await import("../src/database/connection.js");
  await closeDatabase();
});
