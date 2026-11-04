import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("user_profiles", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    first_name: { type: DataTypes.STRING(100), allowNull: true },
    last_name: { type: DataTypes.STRING(100), allowNull: true },
    display_name: { type: DataTypes.STRING(150), allowNull: true },
    profile_image_url: { type: DataTypes.STRING(512), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
    state_or_region: { type: DataTypes.STRING(150), allowNull: true },
    local_government_area: { type: DataTypes.STRING(150), allowNull: true },
    city_or_community: { type: DataTypes.STRING(150), allowNull: true },
    preferred_language: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "en",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("user_profiles", ["user_id"], {
    name: "user_profiles_user_id_unique",
    unique: true,
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("user_profiles");
}
