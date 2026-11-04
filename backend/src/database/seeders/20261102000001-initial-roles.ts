import type { QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export const INITIAL_ROLES = [
  "farmer",
  "buyer",
  "cooperative",
  "transporter",
  "admin",
  "cooperative_agent",
] as const;

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  for (const name of INITIAL_ROLES) {
    await queryInterface.sequelize.query(
      `INSERT INTO "roles" ("id", "name", "created_at", "updated_at")
       VALUES (gen_random_uuid(), :name, NOW(), NOW())
       ON CONFLICT ("name") DO NOTHING`,
      {
        replacements: { name },
      },
    );
  }
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.bulkDelete("roles", {
    name: [...INITIAL_ROLES],
  });
}
