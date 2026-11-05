import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

// Immutable record — no updated_at column.

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("produce_listing_images", {
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
    image_url: { type: DataTypes.STRING(512), allowNull: false },
    storage_key: { type: DataTypes.STRING(512), allowNull: true },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("produce_listing_images", ["listing_id"], {
    name: "listing_images_listing_idx",
  });
  await queryInterface.addIndex("produce_listing_images", ["listing_id"], { name: "listing_images_one_primary_unique", unique: true, where: { is_primary: true } });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("produce_listing_images");
}
