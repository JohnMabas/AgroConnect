import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class CooperativeProfile extends Model<
  InferAttributes<CooperativeProfile>,
  InferCreationAttributes<CooperativeProfile>
> {
  declare id: CreationOptional<string>;
  declare registered_by_user_id: string;
  declare cooperative_name: string;
  declare registration_number: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare state_or_region: CreationOptional<string | null>;
  declare local_government_area: CreationOptional<string | null>;
  declare community: CreationOptional<string | null>;
  declare address: CreationOptional<string | null>;
  declare contact_person_name: CreationOptional<string | null>;
  declare contact_phone: CreationOptional<string | null>;
  declare contact_email: CreationOptional<string | null>;
  declare logo_url: CreationOptional<string | null>;
  declare date_of_registration: CreationOptional<string | null>;
  declare verification_status: CreationOptional<
    | "pending"
    | "under_review"
    | "approved"
    | "rejected"
    | "suspended"
    | "deactivated"
  >;
  declare approval_notes: CreationOptional<string | null>;
  declare approved_by_user_id: CreationOptional<string | null>;
  declare approved_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

CooperativeProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    registered_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    cooperative_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    registration_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contact_person_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    contact_email: {
      type: DataTypes.STRING(254),
      allowNull: true,
    },
    logo_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    date_of_registration: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    verification_status: {
      type: DataTypes.ENUM(
        "pending",
        "under_review",
        "approved",
        "rejected",
        "suspended",
        "deactivated",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    approval_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
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
    tableName: "cooperative_profiles",
    modelName: "CooperativeProfile",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
