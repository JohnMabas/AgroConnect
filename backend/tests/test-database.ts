import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";

export async function resetTestDatabase(): Promise<void> {
  await sequelize.query("DROP SCHEMA IF EXISTS public CASCADE");
  await sequelize.query("CREATE SCHEMA public");
}

export async function migrateTestDatabase(): Promise<void> {
  await resetTestDatabase();
  await runMigrationsUp();
}

export async function migrateAndSeedTestDatabase(): Promise<void> {
  await migrateTestDatabase();
  await runSeedersUp();
}
