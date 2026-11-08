import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type TransporterAvailabilityStatus =
  | "available"
  | "unavailable"
  | "suspended";

export type TransporterApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export class TransporterProfile extends Model<
  InferAttributes<TransporterProfile>,
  InferCreationAttributes<TransporterProfile>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare business_name: string;
  declare contact_phone: string;
  declare operating_location: string;
  declare coverage_areas: CreationOptional<string[]>;
  declare vehicle_type: CreationOptional<string | null>;
  declare vehicle_registration_number: CreationOptional<string | null>;
  declare vehicle_capacity: CreationOptional<string | null>;
  declare produce_types: CreationOptional<string[]>;
  declare availability_status: CreationOptional<TransporterAvailabilityStatus>;
  declare approval_status: CreationOptional<TransporterApprovalStatus>;
  declare approved_by_user_id: CreationOptional<string | null>;
  declare approved_at: CreationOptional<Date | null>;
  declare suspended_reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

TransporterProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    business_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    contact_phone: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    operating_location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    coverage_areas: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    vehicle_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    vehicle_registration_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    vehicle_capacity: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    produce_types: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    availability_status: {
      type: DataTypes.ENUM("available", "unavailable", "suspended"),
      allowNull: false,
      defaultValue: "unavailable",
    },
    approval_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "suspended"),
      allowNull: false,
      defaultValue: "pending",
    },
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspended_reason: {
      type: DataTypes.TEXT,
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
    tableName: "transporter_profiles",
    modelName: "TransporterProfile",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
