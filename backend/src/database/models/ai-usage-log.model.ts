import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type AIUsageFeature =
  | "assistant"
  | "recommendations"
  | "integrity"
  | "knowledge";

export type AIUsageStatus = "success" | "error" | "fallback" | "blocked";

export class AIUsageLog extends Model<
  InferAttributes<AIUsageLog>,
  InferCreationAttributes<AIUsageLog>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare feature: AIUsageFeature;
  declare provider: CreationOptional<string | null>;
  declare model: CreationOptional<string | null>;
  declare status: AIUsageStatus;
  declare request_tokens: CreationOptional<number>;
  declare response_tokens: CreationOptional<number>;
  declare total_tokens: CreationOptional<number>;
  declare latency_ms: CreationOptional<number | null>;
  declare error_code: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AIUsageLog.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    feature: {
      type: DataTypes.ENUM(
        "assistant",
        "recommendations",
        "integrity",
        "knowledge",
      ),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("success", "error", "fallback", "blocked"),
      allowNull: false,
    },
    request_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    response_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    latency_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    error_code: {
      type: DataTypes.STRING(100),
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
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "ai_usage_logs",
    modelName: "AIUsageLog",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
