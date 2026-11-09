import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type VerificationType =
  | "phone"
  | "email"
  | "farmer_identity"
  | "buyer_business"
  | "transporter"
  | "cooperative";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export class Verification extends Model<
  InferAttributes<Verification>,
  InferCreationAttributes<Verification>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare verification_type: VerificationType;
  declare status: CreationOptional<VerificationStatus>;
  declare submitted_at: CreationOptional<Date | null>;
  declare reviewed_at: CreationOptional<Date | null>;
  declare reviewed_by: CreationOptional<string | null>;
  declare rejection_reason: CreationOptional<string | null>;
  declare expiry_date: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Verification.init(
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
    verification_type: {
      type: DataTypes.ENUM(
        "phone",
        "email",
        "farmer_identity",
        "buyer_business",
        "transporter",
        "cooperative",
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "not_submitted",
        "pending",
        "approved",
        "rejected",
        "expired",
      ),
      allowNull: false,
      defaultValue: "not_submitted",
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiry_date: {
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
    tableName: "verifications",
    modelName: "Verification",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
