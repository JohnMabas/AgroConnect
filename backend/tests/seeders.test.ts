import { beforeAll, describe, expect, it } from "vitest";
import { Role, sequelize } from "../src/database/models/index.js";
import {
  getSeederStatus,
  runSeedersDownAll,
  runSeedersUp,
} from "../src/database/seeder.js";
import * as initialRolesSeeder from "../src/database/seeders/20261102000001-initial-roles.js";
import { migrateTestDatabase } from "./test-database.js";

describe("role seeder", () => {
  beforeAll(async () => {
    await migrateTestDatabase();
  });

  it("creates the six roles and is safe to run more than once", async () => {
    await runSeedersUp();
    await expect(Role.count()).resolves.toBe(6);

    const secondRun = await runSeedersUp();
    expect(secondRun).toEqual([]);
    await expect(Role.count()).resolves.toBe(6);

    await initialRolesSeeder.up({
      context: sequelize.getQueryInterface(),
      name: "manual-idempotency-check",
    });
    await expect(Role.count()).resolves.toBe(6);

    const status = await getSeederStatus();
    expect(status.pending).toEqual([]);
  });

  it("rolls back the role seeder", async () => {
    const reverted = await runSeedersDownAll();

    expect(reverted).toEqual(["20261102000001-initial-roles"]);
    await expect(Role.count()).resolves.toBe(0);
  });
});
