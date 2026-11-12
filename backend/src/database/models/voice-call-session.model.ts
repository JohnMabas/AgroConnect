import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type VoiceCallSessionStatus =
  | "active"
  | "completed"
  | "expired"
  | "failed";

export class VoiceCallSession extends Model<
  InferAttributes<VoiceCallSession>,
  InferCreationAttributes<VoiceCallSession>
> {
  declare id: CreationOptional<string>;
  declare provider_session_id: string;
  declare caller_number: string;
  declare destination_number: CreationOptional<string | null>;
  declare direction: CreationOptional<string | null>;
  declare user_id: CreationOptional<string | null>;
  declare language: CreationOptional<string>;
  declare menu_key: CreationOptional<string>;
  declare status: CreationOptional<VoiceCallSessionStatus>;
  declare context: CreationOptional<Record<string, unknown>>;
  declare last_input_hash: CreationOptional<string | null>;
  declare last_input_at: CreationOptional<Date | null>;
  declare last_response_xml: CreationOptional<string | null>;
  declare expires_at: Date;
  declare started_at: Date;
  declare last_activity_at: Date;
  declare ended_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

VoiceCallSession.init(
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
    caller_number: { type: DataTypes.STRING(32), allowNull: false },
    destination_number: { type: DataTypes.STRING(32), allowNull: true },
    direction: { type: DataTypes.STRING(20), allowNull: true },
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
    last_response_xml: { type: DataTypes.TEXT, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    started_at: { type: DataTypes.DATE, allowNull: false },
    last_activity_at: { type: DataTypes.DATE, allowNull: false },
    ended_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "voice_call_sessions",
    modelName: "VoiceCallSession",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
