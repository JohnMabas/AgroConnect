import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("offers", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    offer_number: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_listings", key: "id" },
      onDelete: "RESTRICT",
    },
    buyer_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "buyer_requests", key: "id" },
      onDelete: "RESTRICT",
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "conversations", key: "id" },
      onDelete: "SET NULL",
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
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "RESTRICT",
    },
    parent_offer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "offers", key: "id" },
      onDelete: "SET NULL",
    },
    root_offer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "offers", key: "id" },
      onDelete: "SET NULL",
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
    status: {
      type: DataTypes.ENUM(
        "pending",
        "countered",
        "accepted",
        "rejected",
        "withdrawn",
        "expired",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    withdrawn_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    countered_at: {
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

  await queryInterface.addIndex("offers", ["listing_id"], {
    name: "offers_listing_idx",
  });
  await queryInterface.addIndex("offers", ["buyer_request_id"], {
    name: "offers_buyer_request_idx",
  });
  await queryInterface.addIndex("offers", ["conversation_id"], {
    name: "offers_conversation_idx",
  });
  await queryInterface.addIndex("offers", ["buyer_id"], {
    name: "offers_buyer_idx",
  });
  await queryInterface.addIndex("offers", ["farmer_id"], {
    name: "offers_farmer_idx",
  });
  await queryInterface.addIndex("offers", ["created_by"], {
    name: "offers_created_by_idx",
  });
  await queryInterface.addIndex("offers", ["parent_offer_id"], {
    name: "offers_parent_idx",
  });
  await queryInterface.addIndex("offers", ["root_offer_id"], {
    name: "offers_root_idx",
  });
  await queryInterface.addIndex("offers", ["status"], {
    name: "offers_status_idx",
  });
  await queryInterface.addIndex("offers", ["expires_at"], {
    name: "offers_expires_idx",
  });
  await queryInterface.addIndex("offers", ["status", "expires_at"], {
    name: "offers_status_expires_idx",
  });
  await queryInterface.addIndex("offers", ["buyer_id", "status"], {
    name: "offers_buyer_status_idx",
  });
  await queryInterface.addIndex("offers", ["farmer_id", "status"], {
    name: "offers_farmer_status_idx",
  });
  await queryInterface.addIndex("offers", ["created_at"], {
    name: "offers_created_idx",
  });

  await queryInterface.addConstraint("offers", {
    fields: ["listing_id", "buyer_request_id"],
    type: "check",
    name: "offers_marketplace_context_required",
    where: queryInterface.sequelize.literal(
      "listing_id IS NOT NULL OR buyer_request_id IS NOT NULL",
    ),
  });
  await queryInterface.addConstraint("offers", {
    fields: ["buyer_id", "farmer_id"],
    type: "check",
    name: "offers_distinct_participants",
    where: queryInterface.sequelize.literal("buyer_id <> farmer_id"),
  });
  await queryInterface.addConstraint("offers", {
    fields: ["quantity"],
    type: "check",
    name: "offers_quantity_positive",
    where: queryInterface.sequelize.literal("quantity > 0"),
  });
  await queryInterface.addConstraint("offers", {
    fields: ["unit_price"],
    type: "check",
    name: "offers_unit_price_positive",
    where: queryInterface.sequelize.literal("unit_price > 0"),
  });
  await queryInterface.addConstraint("offers", {
    fields: ["total_amount"],
    type: "check",
    name: "offers_total_amount_positive",
    where: queryInterface.sequelize.literal("total_amount > 0"),
  });

  await queryInterface.createTable("offer_events", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    offer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "offers", key: "id" },
      onDelete: "CASCADE",
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    action: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(20),
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

  await queryInterface.addIndex("offer_events", ["offer_id", "created_at"], {
    name: "offer_events_offer_created_idx",
  });
  await queryInterface.addIndex("offer_events", ["actor_user_id"], {
    name: "offer_events_actor_idx",
  });
  await queryInterface.addIndex("offer_events", ["action"], {
    name: "offer_events_action_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("offer_events");
  await queryInterface.dropTable("offers");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_offers_status"',
  );
}
