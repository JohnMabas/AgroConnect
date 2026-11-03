import { QueryTypes } from "sequelize";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getMigrationStatus,
  runMigrationsDownAll,
  runMigrationsUp,
} from "../src/database/migrator.js";
import { sequelize } from "../src/database/sequelize.js";
import { resetTestDatabase } from "./test-database.js";

const PHASE_2_TABLES = ["roles", "user_roles", "users"];
const PHASE_3_TABLES = [
  "email_verification_tokens",
  "phone_otps",
  "refresh_tokens",
  "user_passwords",
];
const ALL_TABLES = [...PHASE_2_TABLES, ...PHASE_3_TABLES].sort();

const ALL_MIGRATION_NAMES = [
  "20261102000001-create-roles",
  "20261102000002-create-users",
  "20261102000003-create-user-roles",
  "20261102000004-create-user-passwords",
  "20261102000005-create-phone-otps",
  "20261102000006-create-email-verification-tokens",
  "20261102000007-create-refresh-tokens",
];

async function getPublicTables(): Promise<string[]> {
  const rows = await sequelize.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name NOT LIKE 'SequelizeMeta%'
     ORDER BY table_name`,
    { type: QueryTypes.SELECT },
  );
  return rows.map((row) => row.table_name);
}

describe("migrations", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  it(
    "runs all migrations successfully",
    async () => {
      const applied = await runMigrationsUp();

      expect(applied).toEqual(ALL_MIGRATION_NAMES);
      await expect(getPublicTables()).resolves.toEqual(ALL_TABLES);

      const status = await getMigrationStatus();
      expect(status.pending).toEqual([]);
      expect(status.executed).toHaveLength(ALL_MIGRATION_NAMES.length);
    },
    60_000, // allow more time for Aiven cold start
  );

  it(
    "rolls back all migrations and re-runs them",
    async () => {
      const reverted = await runMigrationsDownAll();

      expect(reverted).toEqual([...ALL_MIGRATION_NAMES].reverse());
      await expect(getPublicTables()).resolves.toEqual([]);

      const reapplied = await runMigrationsUp();
      expect(reapplied).toHaveLength(ALL_MIGRATION_NAMES.length);
      await expect(getPublicTables()).resolves.toEqual(ALL_TABLES);
    },
    90_000,
  );
});
