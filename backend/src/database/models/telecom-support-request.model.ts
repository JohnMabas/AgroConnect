import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type TelecomSupportRequestStatus =
  | "open"
  | "acknowledged"
  | "resolved"
  | "closed";

export class TelecomSupportRequest extends Model<
  InferAttributes<TelecomSupportRequest>,
  InferCreationAttributes<TelecomSupportRequest>
> {
  declare id: CreationOptional<string>;
  declare user_id: CreationOptional<string | null>;
  declare phone_number: string;
  declare channel: "ussd" | "voice";
  declare language: CreationOptional<string>;
  declare message: string;
  declare status: CreationOptional<TelecomSupportRequestStatus>;
  declare provider_session_id: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

TelecomSupportRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: { type: DataTypes.UUID, allowNull: true },
    phone_number: { type: DataTypes.STRING(32), allowNull: false },
    channel: {
      type: DataTypes.ENUM("ussd", "voice"),
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "en",
    },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("open", "acknowledged", "resolved", "closed"),
      allowNull: false,
      defaultValue: "open",
    },
    provider_session_id: { type: DataTypes.STRING(200), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "telecom_support_requests",
    modelName: "TelecomSupportRequest",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
