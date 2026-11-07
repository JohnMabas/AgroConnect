import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("inventory_reservations", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "orders", key: "id" },
      onDelete: "CASCADE",
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "produce_listings", key: "id" },
      onDelete: "RESTRICT",
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "active",
        "released",
        "expired",
        "consumed",
        "void",
      ),
      allowNull: false,
      defaultValue: "active",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    released_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    release_reason: {
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

  await queryInterface.addIndex("inventory_reservations", ["order_id"], {
    name: "inventory_reservations_order_unique",
    unique: true,
  });
  await queryInterface.addIndex("inventory_reservations", ["listing_id"], {
    name: "inventory_reservations_listing_idx",
  });
  await queryInterface.addIndex("inventory_reservations", ["status"], {
    name: "inventory_reservations_status_idx",
  });
  await queryInterface.addIndex("inventory_reservations", ["expires_at"], {
    name: "inventory_reservations_expires_idx",
  });
  await queryInterface.addIndex("inventory_reservations", ["status", "expires_at"], {
    name: "inventory_reservations_status_expires_idx",
  });
  await queryInterface.addConstraint("inventory_reservations", {
    fields: ["quantity"],
    type: "check",
    name: "inventory_reservations_quantity_positive",
    where: queryInterface.sequelize.literal("quantity > 0"),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("inventory_reservations");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_inventory_reservations_status"',
  );
}
