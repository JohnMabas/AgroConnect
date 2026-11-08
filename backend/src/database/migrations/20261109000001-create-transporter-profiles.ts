import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("transporter_profiles", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    business_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    contact_phone: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    operating_location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    coverage_areas: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    vehicle_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    vehicle_registration_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    vehicle_capacity: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    produce_types: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    availability_status: {
      type: DataTypes.ENUM("available", "unavailable", "suspended"),
      allowNull: false,
      defaultValue: "unavailable",
    },
    approval_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "suspended"),
      allowNull: false,
      defaultValue: "pending",
    },
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspended_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
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

  await queryInterface.addIndex("transporter_profiles", ["user_id"], {
    name: "transporter_profiles_user_unique",
    unique: true,
  });
  await queryInterface.addIndex("transporter_profiles", ["availability_status"], {
    name: "transporter_profiles_availability_idx",
  });
  await queryInterface.addIndex("transporter_profiles", ["approval_status"], {
    name: "transporter_profiles_approval_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("transporter_profiles");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_transporter_profiles_availability_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_transporter_profiles_approval_status"',
  );
}
