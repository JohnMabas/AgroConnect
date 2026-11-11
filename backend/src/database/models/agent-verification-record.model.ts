import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";
import type { AgentVerificationStatus } from "./agent-profile.model.js";

export interface AgentVerificationDocumentReference {
  document_type: string;
  file_reference: string;
  original_file_name?: string | null;
  file_type?: string | null;
  uploaded_at?: string | null;
}

export class AgentVerificationRecord extends Model<
  InferAttributes<AgentVerificationRecord>,
  InferCreationAttributes<AgentVerificationRecord>
> {
  declare id: CreationOptional<string>;
  declare agent_profile_id: string;
  declare submitted_by_user_id: string;
  declare status: CreationOptional<AgentVerificationStatus>;
  declare identity_reference: CreationOptional<string | null>;
  declare documents: CreationOptional<AgentVerificationDocumentReference[]>;
  declare notes: CreationOptional<string | null>;
  declare reviewed_by_user_id: CreationOptional<string | null>;
  declare reviewed_at: CreationOptional<Date | null>;
  declare rejection_reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AgentVerificationRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    agent_profile_id: { type: DataTypes.UUID, allowNull: false },
    submitted_by_user_id: { type: DataTypes.UUID, allowNull: false },
    status: {
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
    identity_reference: { type: DataTypes.STRING(200), allowNull: true },
    documents: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    reviewed_by_user_id: { type: DataTypes.UUID, allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "agent_verification_records",
    modelName: "AgentVerificationRecord",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
