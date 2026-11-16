import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("password_reset_tokens", {
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
    email: {
      type: DataTypes.STRING(254),
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    "password_reset_tokens",
    ["user_id", "used", "expires_at"],
    { name: "password_reset_tokens_user_active_idx" },
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("password_reset_tokens");
}
