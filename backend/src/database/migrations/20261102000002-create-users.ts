import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("users", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    display_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "suspended"),
      allowNull: false,
      defaultValue: "pending",
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

  await queryInterface.addIndex("users", ["phone_number"], {
    name: "users_phone_number_unique",
    unique: true,
  });

  await queryInterface.addIndex("users", ["email"], {
    name: "users_email_unique",
    unique: true,
  });

  await queryInterface.sequelize.query(
    'ALTER TABLE "users" ADD CONSTRAINT "users_contact_method_check" CHECK ("phone_number" IS NOT NULL OR "email" IS NOT NULL)',
  );

  await queryInterface.sequelize.query(
    'ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_e164_check" CHECK ("phone_number" IS NULL OR "phone_number" ~ \'^\\+[1-9][0-9]{1,14}$\')',
  );

  await queryInterface.sequelize.query(
    'ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized_check" CHECK ("email" IS NULL OR ("email" = lower("email") AND length("email") > 0))',
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("users");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_users_status"',
  );
}
