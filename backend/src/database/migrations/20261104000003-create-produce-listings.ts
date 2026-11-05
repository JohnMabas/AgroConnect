import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("produce_listings", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "produce_types", key: "id" },
      onDelete: "CASCADE",
    },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    variety: { type: DataTypes.STRING(150), allowNull: true },
    grade: { type: DataTypes.STRING(100), allowNull: true },
    quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
    available_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
      defaultValue: 0,
    },
    reserved_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
      defaultValue: 0,
    },
    sold_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "kg",
    },
    price_per_unit: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Nigeria",
    },
    state_or_region: { type: DataTypes.STRING(150), allowNull: true },
    local_government_area: { type: DataTypes.STRING(150), allowNull: true },
    community: { type: DataTypes.STRING(150), allowNull: true },
    collection_location: { type: DataTypes.TEXT, allowNull: true },
    harvest_date: { type: DataTypes.DATEONLY, allowNull: true },
    available_from: { type: DataTypes.DATEONLY, allowNull: true },
    expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "published",
        "paused",
        "sold_out",
        "closed",
        "expired",
      ),
      allowNull: false,
      defaultValue: "draft",
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

  await queryInterface.addIndex("produce_listings", ["farmer_user_id"], {
    name: "produce_listings_farmer_idx",
  });

  await queryInterface.addIndex("produce_listings", ["status"], {
    name: "produce_listings_status_idx",
  });

  await queryInterface.addIndex("produce_listings", ["produce_type_id"], {
    name: "produce_listings_type_idx",
  });

  await queryInterface.addConstraint("produce_listings", { fields: ["quantity"], type: "check", name: "produce_listings_quantity_positive", where: queryInterface.sequelize.literal("quantity > 0") });
  await queryInterface.addConstraint("produce_listings", { fields: ["price_per_unit"], type: "check", name: "produce_listings_price_nonnegative", where: queryInterface.sequelize.literal("price_per_unit >= 0") });
  await queryInterface.addConstraint("produce_listings", { fields: ["available_quantity", "reserved_quantity", "sold_quantity"], type: "check", name: "produce_listings_inventory_nonnegative", where: queryInterface.sequelize.literal("available_quantity >= 0 AND reserved_quantity >= 0 AND sold_quantity >= 0") });
  await queryInterface.addConstraint("produce_listings", { fields: ["quantity", "available_quantity", "reserved_quantity", "sold_quantity"], type: "check", name: "produce_listings_inventory_balanced", where: queryInterface.sequelize.literal("quantity = available_quantity + reserved_quantity + sold_quantity") });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("produce_listings");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_produce_listings_status"',
  );
}
