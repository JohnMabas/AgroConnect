import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded"
  | "partially_refunded";

export class Payment extends Model<
  InferAttributes<Payment>,
  InferCreationAttributes<Payment>
> {
  declare id: CreationOptional<string>;
  declare order_id: string;
  declare provider: CreationOptional<string>;
  declare reference: string;
  declare provider_access_code: CreationOptional<string | null>;
  declare authorization_url: CreationOptional<string | null>;
  declare amount: number;
  declare currency: string;
  declare status: CreationOptional<PaymentStatus>;
  declare channel: CreationOptional<string | null>;
  declare gateway_response: CreationOptional<string | null>;
  declare provider_transaction_id: CreationOptional<number | null>;
  declare paid_at: CreationOptional<Date | null>;
  declare verified_at: CreationOptional<Date | null>;
  declare raw_response: CreationOptional<Record<string, unknown> | null>;
  declare last_error: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Payment.init(
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
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "payments",
    modelName: "Payment",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
