import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type UssdSessionStatus = "active" | "completed" | "expired" | "failed";

export class UssdSession extends Model<
  InferAttributes<UssdSession>,
  InferCreationAttributes<UssdSession>
> {
  declare id: CreationOptional<string>;
  declare provider_session_id: string;
  declare phone_number: string;
  declare network_code: CreationOptional<string | null>;
  declare service_code: CreationOptional<string | null>;
  declare user_id: CreationOptional<string | null>;
  declare language: CreationOptional<string>;
  declare menu_key: CreationOptional<string>;
  declare status: CreationOptional<UssdSessionStatus>;
  declare context: CreationOptional<Record<string, unknown>>;
  declare last_input_hash: CreationOptional<string | null>;
  declare last_input_at: CreationOptional<Date | null>;
  declare last_response_type: CreationOptional<"CON" | "END" | null>;
  declare last_response_text: CreationOptional<string | null>;
  declare expires_at: Date;
  declare started_at: Date;
  declare last_activity_at: Date;
  declare ended_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

UssdSession.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    provider_session_id: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    phone_number: { type: DataTypes.STRING(32), allowNull: false },
    network_code: { type: DataTypes.STRING(40), allowNull: true },
    service_code: { type: DataTypes.STRING(40), allowNull: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "en",
    },
    menu_key: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "main",
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "expired", "failed"),
      allowNull: false,
      defaultValue: "active",
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    last_input_hash: { type: DataTypes.STRING(64), allowNull: true },
    last_input_at: { type: DataTypes.DATE, allowNull: true },
    last_response_type: {
      type: DataTypes.STRING(3),
      allowNull: true,
    },
    last_response_text: { type: DataTypes.TEXT, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    started_at: { type: DataTypes.DATE, allowNull: false },
    last_activity_at: { type: DataTypes.DATE, allowNull: false },
    ended_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "ussd_sessions",
    modelName: "UssdSession",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
