import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type AgentProfileStatus =
  | "invited"
  | "pending_verification"
  | "active"
  | "suspended"
  | "removed"
  | "deactivated";

export type AgentVerificationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "expired";

export class AgentProfile extends Model<
  InferAttributes<AgentProfile>,
  InferCreationAttributes<AgentProfile>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare cooperative_id: string;
  declare full_name: string;
  declare phone_number: string;
  declare email: CreationOptional<string | null>;
  declare identity_verification_reference: CreationOptional<string | null>;
  declare operating_area: CreationOptional<string | null>;
  declare appointment_date: CreationOptional<string | null>;
  declare status: CreationOptional<AgentProfileStatus>;
  declare verification_status: CreationOptional<AgentVerificationStatus>;
  declare code_of_conduct_version: CreationOptional<string | null>;
  declare code_of_conduct_accepted_at: CreationOptional<Date | null>;
  declare invited_by_user_id: string;
  declare verified_by_user_id: CreationOptional<string | null>;
  declare verified_at: CreationOptional<Date | null>;
  declare suspended_at: CreationOptional<Date | null>;
  declare removed_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AgentProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    cooperative_id: { type: DataTypes.UUID, allowNull: false },
    full_name: { type: DataTypes.STRING(200), allowNull: false },
    phone_number: { type: DataTypes.STRING(32), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: true },
    identity_verification_reference: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    operating_area: { type: DataTypes.STRING(200), allowNull: true },
    appointment_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        "invited",
        "pending_verification",
        "active",
        "suspended",
        "removed",
        "deactivated",
      ),
      allowNull: false,
      defaultValue: "invited",
    },
    verification_status: {
      type: DataTypes.ENUM(
        "pending",
        "under_review",
        "approved",
        "rejected",
        "suspended",
        "expired",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    code_of_conduct_version: { type: DataTypes.STRING(50), allowNull: true },
    code_of_conduct_accepted_at: { type: DataTypes.DATE, allowNull: true },
    invited_by_user_id: { type: DataTypes.UUID, allowNull: false },
    verified_by_user_id: { type: DataTypes.UUID, allowNull: true },
    verified_at: { type: DataTypes.DATE, allowNull: true },
    suspended_at: { type: DataTypes.DATE, allowNull: true },
    removed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "agent_profiles",
    modelName: "AgentProfile",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
