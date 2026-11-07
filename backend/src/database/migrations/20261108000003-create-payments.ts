import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("payments", {
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
    provider: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "paystack",
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    provider_access_code: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    authorization_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "success",
        "failed",
        "abandoned",
        "refunded",
        "partially_refunded",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    channel: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    gateway_response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    provider_transaction_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    raw_response: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    last_error: {
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

  await queryInterface.addIndex("payments", ["order_id"], {
    name: "payments_order_idx",
  });
  await queryInterface.addIndex("payments", ["reference"], {
    name: "payments_reference_unique",
    unique: true,
  });
  await queryInterface.addIndex("payments", ["status"], {
    name: "payments_status_idx",
  });
  await queryInterface.addIndex("payments", ["provider_transaction_id"], {
    name: "payments_provider_transaction_idx",
  });
  await queryInterface.addIndex("payments", ["created_at"], {
    name: "payments_created_idx",
  });
  await queryInterface.addConstraint("payments", {
    fields: ["amount"],
    type: "check",
    name: "payments_amount_positive",
    where: queryInterface.sequelize.literal("amount > 0"),
  });

  await queryInterface.createTable("payment_webhook_events", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    provider: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "paystack",
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    payload_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    signature_scheme: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    processed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("payment_webhook_events", ["provider", "payload_hash"], {
    name: "payment_webhook_events_provider_payload_unique",
    unique: true,
  });
  await queryInterface.addIndex("payment_webhook_events", ["reference"], {
    name: "payment_webhook_events_reference_idx",
  });
  await queryInterface.addIndex("payment_webhook_events", ["event_type"], {
    name: "payment_webhook_events_type_idx",
  });
  await queryInterface.addIndex("payment_webhook_events", ["processed"], {
    name: "payment_webhook_events_processed_idx",
  });

  await queryInterface.createTable("refunds", {
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
    payment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "payments", key: "id" },
      onDelete: "RESTRICT",
    },
    requested_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    provider: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "paystack",
    },
    provider_refund_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    transaction_reference: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "processed",
        "failed",
        "needs_attention",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    customer_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    merchant_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    provider_response: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failed_at: {
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

  await queryInterface.addIndex("refunds", ["order_id"], {
    name: "refunds_order_idx",
  });
  await queryInterface.addIndex("refunds", ["payment_id"], {
    name: "refunds_payment_idx",
  });
  await queryInterface.addIndex("refunds", ["provider_refund_id"], {
    name: "refunds_provider_refund_unique",
    unique: true,
  });
  await queryInterface.addIndex("refunds", ["transaction_reference"], {
    name: "refunds_transaction_reference_idx",
  });
  await queryInterface.addIndex("refunds", ["status"], {
    name: "refunds_status_idx",
  });
  await queryInterface.addConstraint("refunds", {
    fields: ["amount"],
    type: "check",
    name: "refunds_amount_positive",
    where: queryInterface.sequelize.literal("amount > 0"),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("refunds");
  await queryInterface.dropTable("payment_webhook_events");
  await queryInterface.dropTable("payments");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_refunds_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_payments_status"',
  );
}
