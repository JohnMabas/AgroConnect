import type { QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_listing_images" ADD COLUMN IF NOT EXISTS "secure_url" VARCHAR(512);',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_types" ADD COLUMN IF NOT EXISTS "secure_url" VARCHAR(512);',
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_types" DROP COLUMN IF EXISTS "secure_url";',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_listing_images" DROP COLUMN IF EXISTS "secure_url";',
  );
}
