import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

// Stores hashed OTPs for phone number verification. The raw OTP value is never
// stored — only a SHA-256 hash. Expired and used records are cleaned up by the
// OTP service but may also be garbage-collected periodically.

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("phone_otps", {
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
    // SHA-256 hex digest of the raw OTP. The raw OTP is only sent to the user
    // via SMS and is never stored or logged.
    otp_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    // Number of failed verification attempts against this OTP record.
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // Marked true when successfully used, preventing reuse.
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

  await queryInterface.addIndex("phone_otps", ["user_id", "used", "expires_at"], {
    name: "phone_otps_user_active_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("phone_otps");
}
