import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class PaymentWebhookEvent extends Model<
  InferAttributes<PaymentWebhookEvent>,
  InferCreationAttributes<PaymentWebhookEvent>
> {
  declare id: CreationOptional<string>;
  declare provider: CreationOptional<string>;
  declare event_type: string;
  declare reference: CreationOptional<string | null>;
  declare payload_hash: string;
  declare payload: Record<string, unknown>;
  declare signature_scheme: CreationOptional<string | null>;
  declare processed: CreationOptional<boolean>;
  declare processed_at: CreationOptional<Date | null>;
  declare error_message: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

PaymentWebhookEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
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
  },
  {
    sequelize,
    tableName: "payment_webhook_events",
    modelName: "PaymentWebhookEvent",
    underscored: true,
    timestamps: false,
  },
);
