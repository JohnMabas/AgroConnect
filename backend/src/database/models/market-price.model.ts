import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type MarketPriceSource =
  | "marketplace_listing"
  | "completed_transaction"
  | "verified_market_observation"
  | "approved_external_source";

export class MarketPrice extends Model<
  InferAttributes<MarketPrice>,
  InferCreationAttributes<MarketPrice>
> {
  declare id: CreationOptional<string>;
  declare produce_type_id: CreationOptional<string | null>;
  declare produce_category_id: CreationOptional<string | null>;
  declare source_type: MarketPriceSource;
  declare source_reference_id: CreationOptional<string | null>;
  declare market_observation_id: CreationOptional<string | null>;
  declare source_name: CreationOptional<string | null>;
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
  declare is_verified: CreationOptional<boolean>;
  declare created_by_user_id: CreationOptional<string | null>;
  declare dedupe_key: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

MarketPrice.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    produce_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    source_type: {
      type: DataTypes.ENUM(
        "marketplace_listing",
        "completed_transaction",
        "verified_market_observation",
        "approved_external_source",
      ),
      allowNull: false,
    },
    source_reference_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    market_observation_id: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
    },
    source_name: {
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
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by_user_id: {
      type: DataTypes.UUID,
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
    tableName: "market_prices",
    modelName: "MarketPrice",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
