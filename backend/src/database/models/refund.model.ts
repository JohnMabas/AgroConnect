import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type RefundStatus =
  | "pending"
  | "processing"
  | "processed"
  | "failed"
  | "needs_attention";

export class Refund extends Model<
  InferAttributes<Refund>,
  InferCreationAttributes<Refund>
> {
  declare id: CreationOptional<string>;
  declare order_id: string;
  declare payment_id: string;
  declare requested_by_user_id: CreationOptional<string | null>;
  declare provider: CreationOptional<string>;
  declare provider_refund_id: CreationOptional<string | null>;
  declare transaction_reference: string;
  declare amount: number;
  declare currency: string;
  declare status: CreationOptional<RefundStatus>;
  declare customer_note: CreationOptional<string | null>;
  declare merchant_note: CreationOptional<string | null>;
  declare provider_response: CreationOptional<Record<string, unknown> | null>;
  declare processed_at: CreationOptional<Date | null>;
  declare failed_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Refund.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    payment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    requested_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "refunds",
    modelName: "Refund",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
