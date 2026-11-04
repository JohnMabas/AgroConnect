import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("cooperative_profiles", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    registered_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    cooperative_name: { type: DataTypes.STRING(200), allowNull: false },
    registration_number: { type: DataTypes.STRING(100), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Nigeria",
    },
    state_or_region: { type: DataTypes.STRING(150), allowNull: true },
    local_government_area: { type: DataTypes.STRING(150), allowNull: true },
    community: { type: DataTypes.STRING(150), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    contact_phone: { type: DataTypes.STRING(32), allowNull: true },
    contact_email: { type: DataTypes.STRING(254), allowNull: true },
    logo_url: { type: DataTypes.STRING(512), allowNull: true },
    verification_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "suspended"),
      allowNull: false,
      defaultValue: "pending",
    },
    approval_notes: { type: DataTypes.TEXT, allowNull: true },
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    approved_at: { type: DataTypes.DATE, allowNull: true },
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

  await queryInterface.addIndex(
    "cooperative_profiles",
    ["registered_by_user_id"],
    { name: "cooperative_profiles_registered_by_idx" },
  );

  await queryInterface.addIndex(
    "cooperative_profiles",
    ["verification_status"],
    { name: "cooperative_profiles_status_idx" },
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("cooperative_profiles");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_cooperative_profiles_verification_status"',
  );
}
