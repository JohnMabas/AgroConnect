import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type FarmerAgentRelationshipStatus =
  | "pending"
  | "active"
  | "suspended"
  | "revoked"
  | "expired"
  | "rejected";

export type FarmerConsentMethod =
  | "in_app"
  | "sms"
  | "ussd"
  | "voice"
  | "cooperative_assisted"
  | "admin";

export class FarmerAgentRelationship extends Model<
  InferAttributes<FarmerAgentRelationship>,
  InferCreationAttributes<FarmerAgentRelationship>
> {
  declare id: CreationOptional<string>;
  declare farmer_user_id: string;
  declare agent_user_id: string;
  declare cooperative_id: string;
  declare agent_profile_id: CreationOptional<string | null>;
  declare status: CreationOptional<FarmerAgentRelationshipStatus>;
  declare consent_method: CreationOptional<FarmerConsentMethod>;
  declare requested_by_user_id: string;
  declare consent_given_at: CreationOptional<Date | null>;
  declare consent_expires_at: CreationOptional<Date | null>;
  declare consent_revoked_at: CreationOptional<Date | null>;
  declare revoked_by_user_id: CreationOptional<string | null>;
  declare rejection_reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

FarmerAgentRelationship.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    farmer_user_id: { type: DataTypes.UUID, allowNull: false },
    agent_user_id: { type: DataTypes.UUID, allowNull: false },
    cooperative_id: { type: DataTypes.UUID, allowNull: false },
    agent_profile_id: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "active",
        "suspended",
        "revoked",
        "expired",
        "rejected",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    consent_method: {
      type: DataTypes.ENUM(
        "in_app",
        "sms",
        "ussd",
        "voice",
        "cooperative_assisted",
        "admin",
      ),
      allowNull: false,
      defaultValue: "in_app",
    },
    requested_by_user_id: { type: DataTypes.UUID, allowNull: false },
    consent_given_at: { type: DataTypes.DATE, allowNull: true },
    consent_expires_at: { type: DataTypes.DATE, allowNull: true },
    consent_revoked_at: { type: DataTypes.DATE, allowNull: true },
    revoked_by_user_id: { type: DataTypes.UUID, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "farmer_agent_relationships",
    modelName: "FarmerAgentRelationship",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
