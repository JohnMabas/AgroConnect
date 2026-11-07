import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "ready_for_delivery",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "payment_failed",
  "refunded",
] as const;

const ORDER_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
] as const;

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("orders", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    order_number: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    offer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "offers", key: "id" },
      onDelete: "RESTRICT",
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_listings", key: "id" },
      onDelete: "RESTRICT",
    },
    buyer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "RESTRICT",
    },
    farmer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "RESTRICT",
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    unit_price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: "pending_payment",
    },
    payment_status: {
      type: DataTypes.ENUM(...ORDER_PAYMENT_STATUSES),
      allowNull: false,
      defaultValue: "pending",
    },
    delivery_terms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    delivery_location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    buyer_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reservation_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellation_reason: {
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

  await queryInterface.addIndex("orders", ["offer_id"], {
    name: "orders_offer_unique",
    unique: true,
  });
  await queryInterface.addIndex("orders", ["listing_id"], {
    name: "orders_listing_idx",
  });
  await queryInterface.addIndex("orders", ["buyer_id"], {
    name: "orders_buyer_idx",
  });
  await queryInterface.addIndex("orders", ["farmer_id"], {
    name: "orders_farmer_idx",
  });
  await queryInterface.addIndex("orders", ["status"], {
    name: "orders_status_idx",
  });
  await queryInterface.addIndex("orders", ["payment_status"], {
    name: "orders_payment_status_idx",
  });
  await queryInterface.addIndex("orders", ["created_at"], {
    name: "orders_created_idx",
  });
  await queryInterface.addIndex("orders", ["buyer_id", "status"], {
    name: "orders_buyer_status_idx",
  });
  await queryInterface.addIndex("orders", ["farmer_id", "status"], {
    name: "orders_farmer_status_idx",
  });

  await queryInterface.addConstraint("orders", {
    fields: ["buyer_id", "farmer_id"],
    type: "check",
    name: "orders_distinct_participants",
    where: queryInterface.sequelize.literal("buyer_id <> farmer_id"),
  });
  await queryInterface.addConstraint("orders", {
    fields: ["quantity"],
    type: "check",
    name: "orders_quantity_positive",
    where: queryInterface.sequelize.literal("quantity > 0"),
  });
  await queryInterface.addConstraint("orders", {
    fields: ["unit_price"],
    type: "check",
    name: "orders_unit_price_positive",
    where: queryInterface.sequelize.literal("unit_price > 0"),
  });
  await queryInterface.addConstraint("orders", {
    fields: ["total_amount"],
    type: "check",
    name: "orders_total_amount_positive",
    where: queryInterface.sequelize.literal("total_amount > 0"),
  });

  await queryInterface.createTable("order_items", {
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
      allowNull: true,
      references: { model: "produce_listings", key: "id" },
      onDelete: "RESTRICT",
    },
    title: {
      type: DataTypes.STRING(300),
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
    unit_price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    line_total: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("order_items", ["order_id"], {
    name: "order_items_order_unique",
    unique: true,
  });
  await queryInterface.addIndex("order_items", ["listing_id"], {
    name: "order_items_listing_idx",
  });
  await queryInterface.addConstraint("order_items", {
    fields: ["quantity"],
    type: "check",
    name: "order_items_quantity_positive",
    where: queryInterface.sequelize.literal("quantity > 0"),
  });
  await queryInterface.addConstraint("order_items", {
    fields: ["line_total"],
    type: "check",
    name: "order_items_line_total_positive",
    where: queryInterface.sequelize.literal("line_total > 0"),
  });

  await queryInterface.createTable("order_events", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
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

  await queryInterface.addIndex("order_events", ["order_id", "created_at"], {
    name: "order_events_order_created_idx",
  });
  await queryInterface.addIndex("order_events", ["actor_user_id"], {
    name: "order_events_actor_idx",
  });
  await queryInterface.addIndex("order_events", ["action"], {
    name: "order_events_action_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("order_events");
  await queryInterface.dropTable("order_items");
  await queryInterface.dropTable("orders");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_orders_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_orders_payment_status"',
  );
}
