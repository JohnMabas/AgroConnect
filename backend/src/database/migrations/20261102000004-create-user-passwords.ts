import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

// One row per user. A user may have no password if they register without one
// (future: magic-link or social login). Currently the registration flow always
// creates a password record.

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("user_passwords", {
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
    // Argon2id hash of the password. Never store plaintext.
    hash: {
      type: DataTypes.STRING(512),
      allowNull: false,
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

  await queryInterface.addIndex("user_passwords", ["user_id"], {
    name: "user_passwords_user_id_unique",
    unique: true,
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("user_passwords");
}
