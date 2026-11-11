import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class FarmerConsentRecord extends Model<
  InferAttributes<FarmerConsentRecord>,
  InferCreationAttributes<FarmerConsentRecord>
> {
  declare id: CreationOptional<string>;
  declare relationship_id: string;
  declare farmer_user_id: string;
  declare agent_user_id: string;
  declare cooperative_id: string;
  declare action: string;
  declare method: string;
  declare ip_address: CreationOptional<string | null>;
  declare user_agent: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

FarmerConsentRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    relationship_id: { type: DataTypes.UUID, allowNull: false },
    farmer_user_id: { type: DataTypes.UUID, allowNull: false },
    agent_user_id: { type: DataTypes.UUID, allowNull: false },
    cooperative_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING(60), allowNull: false },
    method: { type: DataTypes.STRING(40), allowNull: false },
    ip_address: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "farmer_consent_records",
    modelName: "FarmerConsentRecord",
    underscored: true,
    timestamps: false,
  },
);
