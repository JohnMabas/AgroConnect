import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type MarketObservationStatus = "pending" | "approved" | "rejected";

export class MarketObservation extends Model<
  InferAttributes<MarketObservation>,
  InferCreationAttributes<MarketObservation>
> {
  declare id: CreationOptional<string>;
  declare submitted_by_user_id: string;
  declare cooperative_id: CreationOptional<string | null>;
  declare produce_type_id: CreationOptional<string | null>;
  declare produce_category_id: CreationOptional<string | null>;
  declare market_name: CreationOptional<string | null>;
  declare price_per_unit: number;
  declare currency: CreationOptional<string>;
  declare unit: string;
  declare grade: CreationOptional<string | null>;
  declare variety: CreationOptional<string | null>;
  declare quantity: CreationOptional<number | null>;
  declare country: CreationOptional<string | null>;
  declare state_or_region: CreationOptional<string | null>;
  declare local_government_area: CreationOptional<string | null>;
  declare community: CreationOptional<string | null>;
  declare observed_at: string;
  declare notes: CreationOptional<string | null>;
  declare status: CreationOptional<MarketObservationStatus>;
  declare reviewed_by_user_id: CreationOptional<string | null>;
  declare reviewed_at: CreationOptional<Date | null>;
  declare rejection_reason: CreationOptional<string | null>;
  declare dedupe_key: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

MarketObservation.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    submitted_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    produce_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    market_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    price_per_unit: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    grade: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    variety: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 3),
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
    community: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    observed_at: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
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
    tableName: "market_observations",
    modelName: "MarketObservation",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
