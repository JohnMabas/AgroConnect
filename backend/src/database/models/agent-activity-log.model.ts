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
  declare agent_user_id: string;
  declare farmer_user_id: string;
  declare cooperative_id: CreationOptional<string | null>;
  declare action: string;
  declare description: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
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
      allowNull: false,
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
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
