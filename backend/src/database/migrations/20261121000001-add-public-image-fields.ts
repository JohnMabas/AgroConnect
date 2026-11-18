import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.addColumn("produce_listing_images", "public_id", {
    type: DataTypes.STRING(512),
    allowNull: true,
  });
  await queryInterface.addColumn("produce_types", "public_id", {
    type: DataTypes.STRING(512),
    allowNull: true,
  });
  await queryInterface.addColumn("user_profiles", "profile_image_public_id", {
    type: DataTypes.STRING(512),
    allowNull: true,
  });
  await queryInterface.addColumn("farmer_profiles", "farm_image_url", {
    type: DataTypes.STRING(512),
    allowNull: true,
  });
  await queryInterface.addColumn("farmer_profiles", "farm_image_public_id", {
    type: DataTypes.STRING(512),
    allowNull: true,
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.removeColumn("farmer_profiles", "farm_image_public_id");
  await queryInterface.removeColumn("farmer_profiles", "farm_image_url");
  await queryInterface.removeColumn("user_profiles", "profile_image_public_id");
  await queryInterface.removeColumn("produce_types", "public_id");
  await queryInterface.removeColumn("produce_listing_images", "public_id");
}
