import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("conversations", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_listings", key: "id" },
      onDelete: "SET NULL",
    },
    buyer_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "buyer_requests", key: "id" },
      onDelete: "SET NULL",
    },
    status: {
      type: DataTypes.ENUM("active", "archived", "blocked"),
      allowNull: false,
      defaultValue: "active",
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dedupe_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
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

  await queryInterface.addIndex("conversations", ["created_by_user_id"], {
    name: "conversations_created_by_idx",
  });
  await queryInterface.addIndex("conversations", ["listing_id"], {
    name: "conversations_listing_idx",
  });
  await queryInterface.addIndex("conversations", ["buyer_request_id"], {
    name: "conversations_buyer_request_idx",
  });
  await queryInterface.addIndex("conversations", ["status"], {
    name: "conversations_status_idx",
  });
  await queryInterface.addIndex("conversations", ["last_message_at"], {
    name: "conversations_last_message_idx",
  });
  await queryInterface.addIndex("conversations", ["updated_at"], {
    name: "conversations_updated_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("conversations");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_conversations_status"',
  );
}
