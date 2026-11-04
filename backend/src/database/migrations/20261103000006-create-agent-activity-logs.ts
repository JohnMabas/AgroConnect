import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

// Logs are immutable — no updated_at column.

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("agent_activity_logs", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "SET NULL",
    },
    action: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    // Stores non-sensitive context (changed field names, old/new values).
    // Never stores passwords, OTPs, tokens or API keys.
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("agent_activity_logs", ["agent_user_id"], {
    name: "agent_activity_logs_agent_idx",
  });

  await queryInterface.addIndex("agent_activity_logs", ["farmer_user_id"], {
    name: "agent_activity_logs_farmer_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("agent_activity_logs");
}
