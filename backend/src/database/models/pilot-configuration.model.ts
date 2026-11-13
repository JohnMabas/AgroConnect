import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type PilotConfigurationStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export interface PilotReadinessOverride {
  testing_status?: string;
  integration_status?: string;
  pilot_readiness?: string;
  known_issues?: string[];
  evidence?: string[];
  notes?: string;
  reviewed_by_user_id?: string;
  reviewed_at?: string;
}

export class PilotConfiguration extends Model<
  InferAttributes<PilotConfiguration>,
  InferCreationAttributes<PilotConfiguration>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare status: CreationOptional<PilotConfigurationStatus>;
  declare country: CreationOptional<string>;
  declare state_or_region: CreationOptional<string>;
  declare start_date: CreationOptional<string | null>;
  declare end_date: CreationOptional<string | null>;
  declare locations: CreationOptional<string[]>;
  declare produce_category_ids: CreationOptional<string[]>;
  declare readiness_overrides: CreationOptional<
    Record<string, PilotReadinessOverride>
  >;
  declare notes: CreationOptional<string | null>;
  declare is_active: CreationOptional<boolean>;
  declare created_by_user_id: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

PilotConfiguration.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    status: {
      type: DataTypes.ENUM("draft", "active", "paused", "completed", "archived"),
      allowNull: false,
      defaultValue: "draft",
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "Nigeria",
    },
    state_or_region: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "Plateau",
    },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    locations: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    produce_category_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    readiness_overrides: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_by_user_id: { type: DataTypes.UUID, allowNull: true },
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
    tableName: "pilot_configurations",
    modelName: "PilotConfiguration",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
