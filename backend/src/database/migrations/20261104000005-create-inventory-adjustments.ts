import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

// Immutable audit log — no updated_at column.

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("inventory_adjustments", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "produce_listings", key: "id" },
      onDelete: "CASCADE",
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    adjustment_type: {
      type: DataTypes.ENUM("stock_added", "stock_removed", "correction"),
      allowNull: false,
    },
    quantity_change: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
    previous_available_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    new_available_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    reason: { type: DataTypes.TEXT, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("inventory_adjustments", ["listing_id"], {
    name: "inv_adj_listing_idx",
  });

  await queryInterface.addIndex("inventory_adjustments", ["farmer_user_id"], {
    name: "inv_adj_farmer_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("inventory_adjustments");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_inventory_adjustments_adjustment_type"',
  );
}
