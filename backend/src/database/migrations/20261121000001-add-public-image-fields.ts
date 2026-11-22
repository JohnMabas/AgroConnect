import type { QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_listing_images" ADD COLUMN IF NOT EXISTS "public_id" VARCHAR(512);',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_types" ADD COLUMN IF NOT EXISTS "public_id" VARCHAR(512);',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "profile_image_public_id" VARCHAR(512);',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "farmer_profiles" ADD COLUMN IF NOT EXISTS "farm_image_url" VARCHAR(512);',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "farmer_profiles" ADD COLUMN IF NOT EXISTS "farm_image_public_id" VARCHAR(512);',
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.sequelize.query(
    'ALTER TABLE "farmer_profiles" DROP COLUMN IF EXISTS "farm_image_public_id";',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "farmer_profiles" DROP COLUMN IF EXISTS "farm_image_url";',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "profile_image_public_id";',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_types" DROP COLUMN IF EXISTS "public_id";',
  );
  await queryInterface.sequelize.query(
    'ALTER TABLE "produce_listing_images" DROP COLUMN IF EXISTS "public_id";',
  );
}
