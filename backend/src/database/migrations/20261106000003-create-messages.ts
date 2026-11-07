import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("messages", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "conversations", key: "id" },
      onDelete: "CASCADE",
    },
    sender_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    message_type: {
      type: DataTypes.ENUM("text"),
      allowNull: false,
      defaultValue: "text",
    },
    status: {
      type: DataTypes.ENUM("sent", "delivered", "read"),
      allowNull: false,
      defaultValue: "sent",
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    read_at: {
      type: DataTypes.DATE,
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

  await queryInterface.addIndex("messages", ["conversation_id", "created_at"], {
    name: "messages_conversation_created_idx",
  });
  await queryInterface.addIndex("messages", ["sender_user_id"], {
    name: "messages_sender_idx",
  });
  await queryInterface.addIndex("messages", ["status"], {
    name: "messages_status_idx",
  });

  await queryInterface.addConstraint("messages", {
    fields: ["content"],
    type: "check",
    name: "messages_content_length",
    where: queryInterface.sequelize.literal(
      "char_length(content) > 0 AND char_length(content) <= 4000",
    ),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("messages");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_messages_message_type"',
  );
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_status"');
}
