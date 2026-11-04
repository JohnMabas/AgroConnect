import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class CooperativeMembership extends Model<
  InferAttributes<CooperativeMembership>,
  InferCreationAttributes<CooperativeMembership>
> {
  declare id: CreationOptional<string>;
  declare cooperative_id: string;
  declare farmer_user_id: string;
  declare membership_number: CreationOptional<string | null>;
  declare membership_role: CreationOptional<"member" | "coordinator">;
  declare status: CreationOptional<
    "pending" | "active" | "rejected" | "suspended" | "left"
  >;
  declare joined_at: CreationOptional<Date | null>;
  declare approved_by_user_id: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

CooperativeMembership.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    membership_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    membership_role: {
      type: DataTypes.ENUM("member", "coordinator"),
      allowNull: false,
      defaultValue: "member",
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "rejected", "suspended", "left"),
      allowNull: false,
      defaultValue: "pending",
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approved_by_user_id: {
      type: DataTypes.UUID,
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
    tableName: "cooperative_memberships",
    modelName: "CooperativeMembership",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
