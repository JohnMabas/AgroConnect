import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

// Stores hashed refresh tokens for session management. The raw token is sent
// to the client as an HttpOnly cookie. Only the SHA-256 hash is stored.
// Each row represents one active session. Rotation invalidates the previous
// token hash and writes a new one.

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("refresh_tokens", {
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
    // SHA-256 hex digest of the raw refresh token. The raw token is stored only
    // in the client cookie and is never written to the database.
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // Revoked tokens are kept briefly for reuse detection, then garbage-collected.
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Optional: record what client/device issued this token.
    user_agent: {
      type: DataTypes.STRING(512),
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

  await queryInterface.addIndex("refresh_tokens", ["user_id", "revoked"], {
    name: "refresh_tokens_user_active_idx",
  });

  await queryInterface.addIndex("refresh_tokens", ["token_hash"], {
    name: "refresh_tokens_token_hash_idx",
    unique: true,
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("refresh_tokens");
}
