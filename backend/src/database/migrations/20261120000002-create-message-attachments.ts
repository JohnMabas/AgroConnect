import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("message_attachments", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    message_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "messages", key: "id" },
      onDelete: "CASCADE",
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "conversations", key: "id" },
      onDelete: "CASCADE",
    },
    uploader_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    attachment_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    storage_key: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_size_bytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    duration_seconds: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
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

  await queryInterface.addIndex("message_attachments", ["message_id"], {
    name: "message_attachments_message_idx",
  });
  await queryInterface.addIndex("message_attachments", ["conversation_id"], {
    name: "message_attachments_conversation_idx",
  });
  await queryInterface.addIndex("message_attachments", ["uploader_user_id"], {
    name: "message_attachments_uploader_idx",
  });

  await queryInterface.addConstraint("message_attachments", {
    fields: ["attachment_type"],
    type: "check",
    name: "message_attachments_type_check",
    where: queryInterface.sequelize.literal(
      "attachment_type IN ('image', 'audio')",
    ),
  });
  await queryInterface.addConstraint("message_attachments", {
    fields: ["file_size_bytes"],
    type: "check",
    name: "message_attachments_size_positive",
    where: queryInterface.sequelize.literal("file_size_bytes > 0"),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("message_attachments");
}
