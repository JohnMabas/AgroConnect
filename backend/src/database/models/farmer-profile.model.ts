import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class FarmerProfile extends Model<
  InferAttributes<FarmerProfile>,
  InferCreationAttributes<FarmerProfile>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare farm_name: CreationOptional<string | null>;
  declare farming_experience_years: CreationOptional<number | null>;
  declare farm_location: CreationOptional<string | null>;
  declare farm_size: CreationOptional<number | null>;
  declare farm_size_unit: CreationOptional<string | null>;
  declare primary_produce_interests: CreationOptional<string[] | null>;
  declare farming_description: CreationOptional<string | null>;
  declare verification_status: CreationOptional<
    "unverified" | "pending" | "verified" | "rejected"
  >;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

FarmerProfile.init(
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
    farm_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    farming_experience_years: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    farm_location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    farm_size: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    farm_size_unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "hectares",
    },
    primary_produce_interests: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    farming_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verification_status: {
      type: DataTypes.ENUM("unverified", "pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "unverified",
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
    tableName: "farmer_profiles",
    modelName: "FarmerProfile",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
