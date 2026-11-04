import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("cooperative_memberships", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "CASCADE",
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    membership_number: { type: DataTypes.STRING(100), allowNull: true },
    membership_role: {
      type: DataTypes.ENUM("member", "coordinator"),
      allowNull: false,
      defaultValue: "member",
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "rejected", "suspended", "left"),
      allowNull: false,
      defaultValue: "pending",
    },
    joined_at: { type: DataTypes.DATE, allowNull: true },
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
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

  // A farmer can only have one non-historical membership per cooperative.
  // Historical records (left/rejected/suspended) are kept for audit.
  await queryInterface.addIndex(
    "cooperative_memberships",
    ["cooperative_id", "farmer_user_id"],
    { name: "cooperative_memberships_coop_farmer_idx" },
  );

  await queryInterface.addIndex("cooperative_memberships", ["farmer_user_id"], {
    name: "cooperative_memberships_farmer_idx",
  });

  await queryInterface.addIndex("cooperative_memberships", ["status"], {
    name: "cooperative_memberships_status_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("cooperative_memberships");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_cooperative_memberships_membership_role"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_cooperative_memberships_status"',
  );
}
