import { QueryTypes } from "sequelize";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";

export async function resetTestDatabase(): Promise<void> {
  const rows = await sequelize.query<{ schema: string }>(
    "SELECT current_schema() AS schema",
    { type: QueryTypes.SELECT },
  );
  const schema = rows[0]?.schema;
  if (!schema || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error("Unable to determine a safe test schema to reset.");
  }
  const quotedSchema = `"${schema.replaceAll("\"", "\"\"")}"`;
  await sequelize.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
  await sequelize.query(`CREATE SCHEMA ${quotedSchema}`);
}

export async function migrateTestDatabase(): Promise<void> {
  await resetTestDatabase();
  await runMigrationsUp();
}

export async function migrateAndSeedTestDatabase(): Promise<void> {
  await migrateTestDatabase();
  await runSeedersUp();
}
