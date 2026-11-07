import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("buyer_requests", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    buyer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_types", key: "id" },
      onDelete: "SET NULL",
    },
    produce_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_categories", key: "id" },
      onDelete: "SET NULL",
    },
    requested_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    preferred_location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state_or_region: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    local_government_area: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    community: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    target_price_per_unit: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    additional_requirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    required_delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "open",
        "paused",
        "fulfilled",
        "cancelled",
        "expired",
      ),
      allowNull: false,
      defaultValue: "open",
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

  await queryInterface.addIndex("buyer_requests", ["buyer_user_id"], {
    name: "buyer_requests_buyer_idx",
  });
  await queryInterface.addIndex("buyer_requests", ["status"], {
    name: "buyer_requests_status_idx",
  });
  await queryInterface.addIndex("buyer_requests", ["produce_type_id"], {
    name: "buyer_requests_type_idx",
  });
  await queryInterface.addIndex("buyer_requests", ["produce_category_id"], {
    name: "buyer_requests_category_idx",
  });
  await queryInterface.addIndex("buyer_requests", ["expiry_date"], {
    name: "buyer_requests_expiry_idx",
  });
  await queryInterface.addIndex(
    "buyer_requests",
    ["status", "expiry_date"],
    { name: "buyer_requests_status_expiry_idx" },
  );
  await queryInterface.addIndex(
    "buyer_requests",
    ["status", "created_at"],
    { name: "buyer_requests_status_created_idx" },
  );

  await queryInterface.addConstraint("buyer_requests", {
    fields: ["requested_quantity"],
    type: "check",
    name: "buyer_requests_quantity_positive",
    where: queryInterface.sequelize.literal("requested_quantity > 0"),
  });
  await queryInterface.addConstraint("buyer_requests", {
    fields: ["target_price_per_unit"],
    type: "check",
    name: "buyer_requests_target_price_nonnegative",
    where: queryInterface.sequelize.literal(
      "target_price_per_unit IS NULL OR target_price_per_unit >= 0",
    ),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("buyer_requests");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_buyer_requests_status"',
  );
}
