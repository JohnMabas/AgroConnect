import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("conversation_participants", {
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    last_read_at: {
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

  await queryInterface.addConstraint("conversation_participants", {
    fields: ["conversation_id", "user_id"],
    type: "unique",
    name: "conversation_participants_unique",
  });
  await queryInterface.addIndex("conversation_participants", ["conversation_id"], {
    name: "conversation_participants_conversation_idx",
  });
  await queryInterface.addIndex("conversation_participants", ["user_id"], {
    name: "conversation_participants_user_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("conversation_participants");
}
