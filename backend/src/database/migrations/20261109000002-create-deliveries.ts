import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const DELIVERY_STATUSES = [
  "pending",
  "assigned",
  "accepted",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "failed",
] as const;

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("deliveries", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    delivery_reference: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
      onDelete: "CASCADE",
    },
    farmer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "RESTRICT",
    },
    buyer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "RESTRICT",
    },
    transporter_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    pickup_location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    delivery_location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    produce_description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    expected_pickup_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    expected_delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    delivery_fee_minor: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    additional_instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...DELIVERY_STATUSES),
      allowNull: false,
      defaultValue: "pending",
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    picked_up_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    failure_reason: {
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

  await queryInterface.addIndex("deliveries", ["order_id"], {
    name: "deliveries_order_idx",
  });
  // Only one active delivery may exist per order. Cancelled and failed
  // deliveries may be replaced by a new delivery request.
  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX "deliveries_active_order_unique"
       ON "deliveries" ("order_id")
       WHERE "status" NOT IN ('cancelled', 'failed')`,
  );
  await queryInterface.addIndex("deliveries", ["transporter_id"], {
    name: "deliveries_transporter_idx",
  });
  await queryInterface.addIndex("deliveries", ["buyer_id"], {
    name: "deliveries_buyer_idx",
  });
  await queryInterface.addIndex("deliveries", ["farmer_id"], {
    name: "deliveries_farmer_idx",
  });
  await queryInterface.addIndex("deliveries", ["status"], {
    name: "deliveries_status_idx",
  });
  await queryInterface.addIndex("deliveries", ["created_at"], {
    name: "deliveries_created_idx",
  });
  await queryInterface.addIndex("deliveries", ["transporter_id", "status"], {
    name: "deliveries_transporter_status_idx",
  });

  await queryInterface.addConstraint("deliveries", {
    fields: ["quantity"],
    type: "check",
    name: "deliveries_quantity_positive",
    where: queryInterface.sequelize.literal("quantity > 0"),
  });
  await queryInterface.addConstraint("deliveries", {
    fields: ["delivery_fee_minor"],
    type: "check",
    name: "deliveries_fee_non_negative",
    where: queryInterface.sequelize.literal("delivery_fee_minor >= 0"),
  });
  await queryInterface.addConstraint("deliveries", {
    fields: ["expected_pickup_date", "expected_delivery_date"],
    type: "check",
    name: "deliveries_expected_dates_ordered",
    where: queryInterface.sequelize.literal(
      "expected_delivery_date >= expected_pickup_date",
    ),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("deliveries");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_deliveries_status"',
  );
}
