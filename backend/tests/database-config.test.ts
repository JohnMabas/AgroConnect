import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  createSequelizeOptions,
  resolveDatabaseConfig,
  type DatabaseConfigSource,
} from "../src/database/config.js";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "agroconnect-ca-"));
const caPath = join(temporaryDirectory, "aiven-ca.pem");
const caContents = "-----BEGIN CERTIFICATE-----\ntest-ca\n-----END CERTIFICATE-----\n";

writeFileSync(caPath, caContents);

afterAll(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

function createSource(
  overrides: Partial<DatabaseConfigSource> = {},
): DatabaseConfigSource {
  return {
    NODE_ENV: "test",
    DB_SSL: false,
    DB_PORT: 5432,
    DB_HOST: "127.0.0.1",
    DB_NAME: "agroconnect_test",
    DB_USER: "postgres",
    DB_PASSWORD: "postgres",
    ...overrides,
  };
}

describe("database configuration", () => {
  it("uses individual DB variables when DATABASE_URL is absent", () => {
    const config = resolveDatabaseConfig(createSource());

    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 5432,
      database: "agroconnect_test",
      username: "postgres",
      password: "postgres",
      ssl: false,
      insecureSsl: false,
    });
  });

  it("prefers DATABASE_URL and strips sslmode from the connection", () => {
    const options = createSequelizeOptions(
      createSource({
        DATABASE_URL:
          "postgres://aiven_user:secret@db.example.com:25000/agroconnect?sslmode=require",
        DB_HOST: "ignored.example.com",
        DB_NAME: "ignored",
        DB_USER: "ignored",
      }),
    );

    expect(options).toMatchObject({
      host: "db.example.com",
      port: 25000,
      database: "agroconnect",
      username: "aiven_user",
      password: "secret",
    });
    expect(options.dialectOptions).toBeUndefined();
  });

  it("rejects incomplete configuration", () => {
    expect(() =>
      resolveDatabaseConfig(
        createSource({ DB_HOST: undefined, DB_NAME: undefined }),
      ),
    ).toThrow(/DB_HOST is required/);
  });

  it("rejects invalid DATABASE_URL values", () => {
    expect(() =>
      resolveDatabaseConfig(
        createSource({ DATABASE_URL: "mysql://user:pass@host/db" }),
      ),
    ).toThrow(/postgres/);

    expect(() =>
      resolveDatabaseConfig(
        createSource({ DATABASE_URL: "not-a-url" }),
      ),
    ).toThrow(/valid PostgreSQL connection URL/);
  });

  it("requires a CA certificate when production verification is enabled", () => {
    expect(() =>
      resolveDatabaseConfig(
        createSource({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://user:pass@db.example.com:25000/agroconnect",
          DB_SSL: true,
        }),
      ),
    ).toThrow(/DB_SSL_CA_PATH is required/);
  });

  it("configures verified TLS with the Aiven CA certificate", () => {
    const config = resolveDatabaseConfig(
      createSource({
        DATABASE_URL: "postgres://user:pass@db.example.com:25000/agroconnect",
        DB_SSL: true,
        DB_SSL_CA_PATH: caPath,
        DB_SSL_VERIFY: true,
      }),
    );

    expect(config.ssl).toMatchObject({
      ca: caContents,
      rejectUnauthorized: true,
      servername: "db.example.com",
    });
    expect(config.insecureSsl).toBe(false);
  });

  it("allows explicit insecure encryption without silently disabling verification", () => {
    const config = resolveDatabaseConfig(
      createSource({
        DATABASE_URL: "postgres://user:pass@db.example.com:25000/agroconnect",
        DB_SSL: true,
        DB_SSL_VERIFY: false,
      }),
    );

    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.insecureSsl).toBe(true);
  });

  it("rejects a CA path when SSL is disabled", () => {
    expect(() =>
      resolveDatabaseConfig(
        createSource({ DB_SSL: false, DB_SSL_CA_PATH: caPath }),
      ),
    ).toThrow(/DB_SSL_CA_PATH is set but DB_SSL is false/);
  });

  it("rejects an unreadable CA certificate", () => {
    expect(() =>
      resolveDatabaseConfig(
        createSource({
          DB_SSL: true,
          DB_SSL_CA_PATH: join(temporaryDirectory, "missing.pem"),
        }),
      ),
    ).toThrow(/could not be read/);
  });
});
