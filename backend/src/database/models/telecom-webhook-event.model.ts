import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type TelecomChannel = "ussd" | "voice";
export type TelecomWebhookEventStatus =
  | "received"
  | "processed"
  | "duplicate"
  | "rejected"
  | "failed";

export class TelecomWebhookEvent extends Model<
  InferAttributes<TelecomWebhookEvent>,
  InferCreationAttributes<TelecomWebhookEvent>
> {
  declare id: CreationOptional<string>;
  declare provider: CreationOptional<string>;
  declare channel: TelecomChannel;
  declare event_key: string;
  declare provider_session_id: CreationOptional<string | null>;
  declare payload_hash: string;
  declare status: CreationOptional<TelecomWebhookEventStatus>;
  declare error_message: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare received_at: CreationOptional<Date>;
  declare processed_at: CreationOptional<Date | null>;
}

TelecomWebhookEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    provider: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "africastalking",
    },
    channel: {
      type: DataTypes.ENUM("ussd", "voice"),
      allowNull: false,
    },
    event_key: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    provider_session_id: { type: DataTypes.STRING(200), allowNull: true },
    payload_hash: { type: DataTypes.STRING(64), allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "received",
        "processed",
        "duplicate",
        "rejected",
        "failed",
      ),
      allowNull: false,
      defaultValue: "received",
    },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    received_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    processed_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "telecom_webhook_events",
    modelName: "TelecomWebhookEvent",
    underscored: true,
    timestamps: false,
  },
);
