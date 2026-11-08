import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("notifications", {
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    notification_type: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM("in_app", "email", "sms"),
      allowNull: false,
      defaultValue: "in_app",
    },
    related_entity_type: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    related_entity_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    action_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dedupe_key: {
      type: DataTypes.STRING(255),
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

  await queryInterface.addIndex("notifications", ["user_id", "created_at"], {
    name: "notifications_user_created_idx",
  });
  await queryInterface.addIndex("notifications", ["user_id", "is_read"], {
    name: "notifications_user_read_idx",
  });
  await queryInterface.addIndex("notifications", ["notification_type"], {
    name: "notifications_type_idx",
  });
  await queryInterface.addIndex("notifications", ["dedupe_key"], {
    name: "notifications_dedupe_unique",
    unique: true,
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("notifications");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_notifications_channel"',
  );
}
