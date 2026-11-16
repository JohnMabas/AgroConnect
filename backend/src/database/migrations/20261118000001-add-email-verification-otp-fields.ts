import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

// Email verification now uses a 6-digit OTP. The email address is stored with
// each code so it is bound to the address it was issued for, and attempts
// supports the maximum-attempts lockout.

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.addColumn("email_verification_tokens", "email", {
    type: DataTypes.STRING(254),
    allowNull: true,
  });

  await queryInterface.addColumn("email_verification_tokens", "attempts", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await queryInterface.addIndex(
    "email_verification_tokens",
    ["user_id", "email", "used", "expires_at"],
    { name: "email_verification_tokens_user_email_active_idx" },
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.removeIndex(
    "email_verification_tokens",
    "email_verification_tokens_user_email_active_idx",
  );
  await queryInterface.removeColumn("email_verification_tokens", "attempts");
  await queryInterface.removeColumn("email_verification_tokens", "email");
}
