import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type MarketInsightType =
  | "price_increase"
  | "price_decrease"
  | "price_volatility"
  | "supply_shortage"
  | "supply_surplus"
  | "demand_increase"
  | "demand_decrease";

export type MarketInsightSeverity = "low" | "medium" | "high";

export type MarketInsightStatus = "active" | "expired" | "dismissed";

export class MarketInsight extends Model<
  InferAttributes<MarketInsight>,
  InferCreationAttributes<MarketInsight>
> {
  declare id: CreationOptional<string>;
  declare insight_type: MarketInsightType;
  declare produce_type_id: CreationOptional<string | null>;
  declare produce_category_id: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare state_or_region: CreationOptional<string | null>;
  declare local_government_area: CreationOptional<string | null>;
  declare currency: CreationOptional<string | null>;
  declare unit: CreationOptional<string | null>;
  declare title: string;
  declare summary: string;
  declare severity: CreationOptional<MarketInsightSeverity>;
  declare metric_value: CreationOptional<number | null>;
  declare comparison_value: CreationOptional<number | null>;
  declare change_percentage: CreationOptional<number | null>;
  declare observation_count: CreationOptional<number>;
  declare period_start: string;
  declare period_end: string;
  declare status: CreationOptional<MarketInsightStatus>;
  declare generated_at: CreationOptional<Date>;
  declare expires_at: CreationOptional<Date | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare dedupe_key: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

MarketInsight.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    insight_type: {
      type: DataTypes.ENUM(
        "price_increase",
        "price_decrease",
        "price_volatility",
        "supply_shortage",
        "supply_surplus",
        "demand_increase",
        "demand_decrease",
      ),
      allowNull: false,
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    produce_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state_or_region: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    local_government_area: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "low",
    },
    metric_value: {
      type: DataTypes.DECIMAL(18, 3),
      allowNull: true,
    },
    comparison_value: {
      type: DataTypes.DECIMAL(18, 3),
      allowNull: true,
    },
    change_percentage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    observation_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "expired", "dismissed"),
      allowNull: false,
      defaultValue: "active",
    },
    generated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    dedupe_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
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
    tableName: "market_insights",
    modelName: "MarketInsight",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
