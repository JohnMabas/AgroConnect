import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type CallType = "audio" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "ended"
  | "missed"
  | "cancelled"
  | "failed";

export class CallSession extends Model<
  InferAttributes<CallSession>,
  InferCreationAttributes<CallSession>
> {
  declare id: CreationOptional<string>;
  declare conversation_id: string;
  declare caller_user_id: string;
  declare callee_user_id: string;
  declare call_type: CallType;
  declare status: CallStatus;
  declare initiated_at: Date;
  declare accepted_at: CreationOptional<Date | null>;
  declare ended_at: CreationOptional<Date | null>;
  declare ended_by_user_id: CreationOptional<string | null>;
  declare end_reason: CreationOptional<string | null>;
  declare duration_seconds: CreationOptional<number | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

CallSession.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    caller_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    callee_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    call_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    initiated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ended_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    end_reason: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
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
    tableName: "call_sessions",
    modelName: "CallSession",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
