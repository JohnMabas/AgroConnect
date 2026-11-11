import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class FarmerAgentPermission extends Model<
  InferAttributes<FarmerAgentPermission>,
  InferCreationAttributes<FarmerAgentPermission>
> {
  declare id: CreationOptional<string>;
  declare relationship_id: string;
  declare permission_key: string;
  declare is_granted: CreationOptional<boolean>;
  declare granted_at: CreationOptional<Date | null>;
  declare revoked_at: CreationOptional<Date | null>;
  declare granted_by_user_id: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

FarmerAgentPermission.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    relationship_id: { type: DataTypes.UUID, allowNull: false },
    permission_key: { type: DataTypes.STRING(80), allowNull: false },
    is_granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    granted_at: { type: DataTypes.DATE, allowNull: true },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    granted_by_user_id: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "farmer_agent_permissions",
    modelName: "FarmerAgentPermission",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
