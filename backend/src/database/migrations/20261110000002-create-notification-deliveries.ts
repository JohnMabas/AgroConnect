import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("notification_deliveries", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    notification_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "notifications", key: "id" },
      onDelete: "CASCADE",
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    channel: {
      type: DataTypes.ENUM("in_app", "email", "sms"),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    provider_reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    delivery_status: {
      type: DataTypes.ENUM(
        "pending",
        "sent",
        "delivered",
        "failed",
        "skipped",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_attempt_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_attempt_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failure_reason: {
      type: DataTypes.TEXT,
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

  await queryInterface.addIndex(
    "notification_deliveries",
    ["notification_id", "channel"],
    {
      name: "notification_deliveries_notification_channel_unique",
      unique: true,
    },
  );
  await queryInterface.addIndex(
    "notification_deliveries",
    ["delivery_status", "next_attempt_at"],
    { name: "notification_deliveries_retry_idx" },
  );
  await queryInterface.addIndex("notification_deliveries", ["user_id"], {
    name: "notification_deliveries_user_idx",
  });
  await queryInterface.addIndex("notification_deliveries", ["notification_id"], {
    name: "notification_deliveries_notification_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("notification_deliveries");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_notification_deliveries_channel"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_notification_deliveries_delivery_status"',
  );
}
