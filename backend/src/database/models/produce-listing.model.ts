import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type ProduceListingStatus =
  | "draft"
  | "published"
  | "paused"
  | "sold_out"
  | "closed"
  | "expired";

export class ProduceListing extends Model<
  InferAttributes<ProduceListing>,
  InferCreationAttributes<ProduceListing>
> {
  declare id: CreationOptional<string>;
  declare farmer_user_id: string;
  declare produce_type_id: string;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare variety: CreationOptional<string | null>;
  declare grade: CreationOptional<string | null>;
  declare quantity: number;
  declare available_quantity: CreationOptional<number>;
  declare reserved_quantity: CreationOptional<number>;
  declare sold_quantity: CreationOptional<number>;
  declare unit: CreationOptional<string>;
  declare packaging_description: CreationOptional<string | null>;
  declare price_per_unit: number;
  declare currency: CreationOptional<string>;
  declare country: CreationOptional<string | null>;
  declare state_or_region: CreationOptional<string | null>;
  declare local_government_area: CreationOptional<string | null>;
  declare community: CreationOptional<string | null>;
  declare collection_location: CreationOptional<string | null>;
  declare harvest_date: CreationOptional<string | null>;
  declare available_from: CreationOptional<string | null>;
  declare expiry_date: CreationOptional<string | null>;
  declare status: CreationOptional<ProduceListingStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ProduceListing.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    variety: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    grade: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    available_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
      defaultValue: 0,
    },
    reserved_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
      defaultValue: 0,
    },
    sold_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "kg",
    },
    packaging_description: {
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
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Nigeria",
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
    collection_location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    harvest_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    available_from: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "published",
        "paused",
        "sold_out",
        "closed",
        "expired",
      ),
      allowNull: false,
      defaultValue: "draft",
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
    tableName: "produce_listings",
    modelName: "ProduceListing",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
