import { QueryTypes } from "sequelize";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getMigrationStatus,
  runMigrationsDownAll,
  runMigrationsUp,
} from "../src/database/migrator.js";
import { sequelize } from "../src/database/sequelize.js";
import { resetTestDatabase } from "./test-database.js";

async function getPhaseTwoTables(): Promise<string[]> {
  const rows = await sequelize.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('users', 'roles', 'user_roles')
     ORDER BY table_name`,
    { type: QueryTypes.SELECT },
  );

  return rows.map((row) => row.table_name);
}

describe("migrations", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  it("runs all migrations successfully", async () => {
    const applied = await runMigrationsUp();

    expect(applied).toEqual([
      "20261102000001-create-roles",
      "20261102000002-create-users",
      "20261102000003-create-user-roles",
    ]);
    await expect(getPhaseTwoTables()).resolves.toEqual([
      "roles",
      "user_roles",
      "users",
    ]);

    const status = await getMigrationStatus();
    expect(status.pending).toEqual([]);
    expect(status.executed).toHaveLength(3);
  });

  it("rolls back all migrations and re-runs them", async () => {
    const reverted = await runMigrationsDownAll();

    expect(reverted).toEqual([
      "20261102000003-create-user-roles",
      "20261102000002-create-users",
      "20261102000001-create-roles",
    ]);
    await expect(getPhaseTwoTables()).resolves.toEqual([]);

    const reapplied = await runMigrationsUp();
    expect(reapplied).toHaveLength(3);
    await expect(getPhaseTwoTables()).resolves.toEqual([
      "roles",
      "user_roles",
      "users",
    ]);
  });
});
