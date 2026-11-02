import { resolve4 } from "node:dns/promises";
import { afterAll } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined || testDatabaseUrl.trim() === "") {
  throw new Error(
    "TEST_DATABASE_URL is required to run the AgroConnect database tests. Point it at an isolated PostgreSQL test database.",
  );
}

let databaseName: string;
let parsedUrl: URL;

try {
  parsedUrl = new URL(testDatabaseUrl);
  databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
} catch {
  throw new Error("TEST_DATABASE_URL is not a valid PostgreSQL URL.");
}

if (!/test/i.test(databaseName)) {
  throw new Error(
    'Refusing to run destructive database tests because the TEST_DATABASE_URL database name does not include "test".',
  );
}

const testDatabaseSsl = process.env.TEST_DB_SSL ?? "false";
const testDatabaseSslVerify = process.env.TEST_DB_SSL_VERIFY;
const testDatabaseSslCaPath = process.env.TEST_DB_SSL_CA_PATH;

// Pre-resolve hostname to IPv4 before importing any database module.
// This avoids Node.js Happy Eyeballs racing IPv4 against an unreachable
// NAT64 AAAA record which causes ETIMEDOUT in the Sequelize pool.
const testHostname = parsedUrl.hostname;
if (testHostname) {
  try {
    const addresses = await resolve4(testHostname);
    const ipv4 = addresses[0];
    if (ipv4 !== undefined && ipv4 !== testHostname) {
      const resolved = new URL(testDatabaseUrl);
      process.env.DB_SSL_SERVERNAME = testHostname;
      resolved.hostname = ipv4;
      process.env.DATABASE_URL = resolved.toString();
    } else {
      process.env.DATABASE_URL = testDatabaseUrl;
    }
  } catch {
    // Resolution failed; use original URL and hope the network handles it.
    process.env.DATABASE_URL = testDatabaseUrl;
  }
} else {
  process.env.DATABASE_URL = testDatabaseUrl;
}

process.env.NODE_ENV = "test";
process.env.DB_SSL = testDatabaseSsl;
process.env.DEFAULT_PHONE_COUNTRY = "NG";

delete process.env.DB_HOST;
delete process.env.DB_NAME;
delete process.env.DB_USER;
delete process.env.DB_PASSWORD;

if (testDatabaseSsl !== "true") {
  // Local test databases use plain TCP; disable SSL entirely.
  delete process.env.DB_SSL_CA_PATH;
  delete process.env.DB_SSL_VERIFY;
} else {
  // TLS is enabled for the test database (e.g. Aiven).
  // TEST_DB_SSL_VERIFY controls certificate verification:
  //   - Omitted or "true" → full verification (requires TEST_DB_SSL_CA_PATH).
  //   - "false"           → encrypt but skip certificate verification.
  // TEST_DB_SSL_CA_PATH optionally provides a CA certificate.
  if (testDatabaseSslVerify !== undefined) {
    process.env.DB_SSL_VERIFY = testDatabaseSslVerify;
  } else {
    delete process.env.DB_SSL_VERIFY;
  }

  if (testDatabaseSslCaPath !== undefined) {
    process.env.DB_SSL_CA_PATH = testDatabaseSslCaPath;
  } else {
    delete process.env.DB_SSL_CA_PATH;
  }
}

afterAll(async () => {
  const { closeDatabase } = await import("../src/database/connection.js");
  await closeDatabase();
});
