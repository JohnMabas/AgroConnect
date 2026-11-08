import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("delivery_history", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    delivery_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "deliveries", key: "id" },
      onDelete: "CASCADE",
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("delivery_history", ["delivery_id", "created_at"], {
    name: "delivery_history_delivery_created_idx",
  });
  await queryInterface.addIndex("delivery_history", ["actor_user_id"], {
    name: "delivery_history_actor_idx",
  });
  await queryInterface.addIndex("delivery_history", ["action"], {
    name: "delivery_history_action_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("delivery_history");
}
