import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type FarmerActionApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type FarmerApprovalMethod = "in_app" | "sms" | "ussd" | "voice";

export class FarmerActionApproval extends Model<
  InferAttributes<FarmerActionApproval>,
  InferCreationAttributes<FarmerActionApproval>
> {
  declare id: CreationOptional<string>;
  declare farmer_user_id: string;
  declare agent_user_id: string;
  declare cooperative_id: string;
  declare relationship_id: CreationOptional<string | null>;
  declare action_type: string;
  declare resource_type: string;
  declare resource_id: CreationOptional<string | null>;
  declare previous_values: CreationOptional<Record<string, unknown> | null>;
  declare proposed_values: Record<string, unknown>;
  declare proposed_values_hash: string;
  declare approval_status: CreationOptional<FarmerActionApprovalStatus>;
  declare approval_method: CreationOptional<FarmerApprovalMethod>;
  declare evidence_reference: CreationOptional<string | null>;
  declare expires_at: Date;
  declare approved_at: CreationOptional<Date | null>;
  declare rejected_at: CreationOptional<Date | null>;
  declare cancelled_at: CreationOptional<Date | null>;
  declare applied_at: CreationOptional<Date | null>;
  declare application_result: CreationOptional<Record<string, unknown> | null>;
  declare failure_reason: CreationOptional<string | null>;
  declare idempotency_key: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

FarmerActionApproval.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    farmer_user_id: { type: DataTypes.UUID, allowNull: false },
    agent_user_id: { type: DataTypes.UUID, allowNull: false },
    cooperative_id: { type: DataTypes.UUID, allowNull: false },
    relationship_id: { type: DataTypes.UUID, allowNull: true },
    action_type: { type: DataTypes.STRING(60), allowNull: false },
    resource_type: { type: DataTypes.STRING(60), allowNull: false },
    resource_id: { type: DataTypes.UUID, allowNull: true },
    previous_values: { type: DataTypes.JSONB, allowNull: true },
    proposed_values: { type: DataTypes.JSONB, allowNull: false },
    proposed_values_hash: { type: DataTypes.STRING(64), allowNull: false },
    approval_status: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    approval_method: {
      type: DataTypes.ENUM("in_app", "sms", "ussd", "voice"),
      allowNull: false,
      defaultValue: "in_app",
    },
    evidence_reference: { type: DataTypes.STRING(255), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejected_at: { type: DataTypes.DATE, allowNull: true },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    applied_at: { type: DataTypes.DATE, allowNull: true },
    application_result: { type: DataTypes.JSONB, allowNull: true },
    failure_reason: { type: DataTypes.TEXT, allowNull: true },
    idempotency_key: { type: DataTypes.STRING(128), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "farmer_action_approvals",
    modelName: "FarmerActionApproval",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
