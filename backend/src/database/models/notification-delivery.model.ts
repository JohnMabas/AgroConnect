import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";
import type { NotificationChannel } from "./notification.model.js";

export type NotificationDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped";

export class NotificationDelivery extends Model<
  InferAttributes<NotificationDelivery>,
  InferCreationAttributes<NotificationDelivery>
> {
  declare id: CreationOptional<string>;
  declare notification_id: string;
  declare user_id: string;
  declare channel: NotificationChannel;
  declare provider: string;
  declare provider_reference: CreationOptional<string | null>;
  declare delivery_status: CreationOptional<NotificationDeliveryStatus>;
  declare attempts: CreationOptional<number>;
  declare last_attempt_at: CreationOptional<Date | null>;
  declare next_attempt_at: CreationOptional<Date | null>;
  declare delivered_at: CreationOptional<Date | null>;
  declare failure_reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

NotificationDelivery.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    notification_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM("in_app", "email", "sms"),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    provider_reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    delivery_status: {
      type: DataTypes.ENUM(
        "pending",
        "sent",
        "delivered",
        "failed",
        "skipped",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_attempt_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_attempt_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failure_reason: {
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
    tableName: "notification_deliveries",
    modelName: "NotificationDelivery",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
