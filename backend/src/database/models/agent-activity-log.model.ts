import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

// Immutable audit log — no updated_at column. timestamps: false prevents
// Sequelize from attempting to manage updatedAt automatically.

export class AgentActivityLog extends Model<
  InferAttributes<AgentActivityLog>,
  InferCreationAttributes<AgentActivityLog>
> {
  declare id: CreationOptional<string>;
  declare agent_user_id: CreationOptional<string | null>;
  declare farmer_user_id: CreationOptional<string | null>;
  declare cooperative_id: CreationOptional<string | null>;
  declare action: string;
  declare description: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare resource_type: CreationOptional<string | null>;
  declare resource_id: CreationOptional<string | null>;
  declare previous_values: CreationOptional<Record<string, unknown> | null>;
  declare new_values: CreationOptional<Record<string, unknown> | null>;
  declare approval_required: CreationOptional<boolean>;
  declare approval_id: CreationOptional<string | null>;
  declare approval_status: CreationOptional<string | null>;
  declare action_result: CreationOptional<string | null>;
  declare ip_address: CreationOptional<string | null>;
  declare user_agent: CreationOptional<string | null>;
  declare correlation_id: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

AgentActivityLog.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    resource_type: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    resource_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    previous_values: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    approval_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    approval_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approval_status: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    action_result: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    correlation_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "agent_activity_logs",
    modelName: "AgentActivityLog",
    underscored: true,
    timestamps: false,
  },
);
