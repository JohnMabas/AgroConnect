import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type NotificationChannel = "in_app" | "email" | "sms";

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare title: string;
  declare message: string;
  declare notification_type: string;
  declare channel: NotificationChannel;
  declare related_entity_type: CreationOptional<string | null>;
  declare related_entity_id: CreationOptional<string | null>;
  declare action_url: CreationOptional<string | null>;
  declare is_read: CreationOptional<boolean>;
  declare read_at: CreationOptional<Date | null>;
  declare dedupe_key: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    notification_type: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM("in_app", "email", "sms"),
      allowNull: false,
      defaultValue: "in_app",
    },
    related_entity_type: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    related_entity_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    action_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dedupe_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
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
    tableName: "notifications",
    modelName: "Notification",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
