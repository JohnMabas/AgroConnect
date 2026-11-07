import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type BuyerRequestStatus =
  | "open"
  | "paused"
  | "fulfilled"
  | "cancelled"
  | "expired";

export class BuyerRequest extends Model<
  InferAttributes<BuyerRequest>,
  InferCreationAttributes<BuyerRequest>
> {
  declare id: CreationOptional<string>;
  declare buyer_user_id: string;
  declare produce_type_id: CreationOptional<string | null>;
  declare produce_category_id: CreationOptional<string | null>;
  declare requested_quantity: number;
  declare unit: string;
  declare preferred_location: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare state_or_region: CreationOptional<string | null>;
  declare local_government_area: CreationOptional<string | null>;
  declare community: CreationOptional<string | null>;
  declare target_price_per_unit: CreationOptional<number | null>;
  declare currency: CreationOptional<string>;
  declare additional_requirements: CreationOptional<string | null>;
  declare required_delivery_date: CreationOptional<string | null>;
  declare expiry_date: string;
  declare status: CreationOptional<BuyerRequestStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

BuyerRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    buyer_user_id: {
      type: DataTypes.UUID,
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
    requested_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    preferred_location: {
      type: DataTypes.TEXT,
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
    target_price_per_unit: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    additional_requirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    required_delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "open",
        "paused",
        "fulfilled",
        "cancelled",
        "expired",
      ),
      allowNull: false,
      defaultValue: "open",
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
    tableName: "buyer_requests",
    modelName: "BuyerRequest",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
