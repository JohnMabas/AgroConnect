import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("cooperative_agent_assignments", {
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
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    assigned_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("active", "deactivated"),
      allowNull: false,
      defaultValue: "active",
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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

  await queryInterface.addIndex(
    "cooperative_agent_assignments",
    ["agent_user_id"],
    { name: "coop_agent_assignments_agent_idx" },
  );

  await queryInterface.addIndex(
    "cooperative_agent_assignments",
    ["cooperative_id", "agent_user_id"],
    { name: "coop_agent_assignments_coop_agent_idx" },
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("cooperative_agent_assignments");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_cooperative_agent_assignments_status"',
  );
}
