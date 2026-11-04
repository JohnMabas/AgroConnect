import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("farmer_profiles", {
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
    farm_name: { type: DataTypes.STRING(200), allowNull: true },
    farming_experience_years: { type: DataTypes.INTEGER, allowNull: true },
    farm_location: { type: DataTypes.TEXT, allowNull: true },
    farm_size: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    farm_size_unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "hectares",
    },
    primary_produce_interests: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    farming_description: { type: DataTypes.TEXT, allowNull: true },
    verification_status: {
      type: DataTypes.ENUM("unverified", "pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "unverified",
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

  await queryInterface.addIndex("farmer_profiles", ["user_id"], {
    name: "farmer_profiles_user_id_unique",
    unique: true,
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("farmer_profiles");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_farmer_profiles_verification_status"',
  );
}
