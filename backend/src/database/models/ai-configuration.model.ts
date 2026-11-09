import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class AIConfiguration extends Model<
  InferAttributes<AIConfiguration>,
  InferCreationAttributes<AIConfiguration>
> {
  declare id: CreationOptional<string>;
  declare assistant_enabled: CreationOptional<boolean>;
  declare recommendations_enabled: CreationOptional<boolean>;
  declare integrity_enabled: CreationOptional<boolean>;
  declare updated_by_user_id: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AIConfiguration.init(
  {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: "global",
    },
    assistant_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    recommendations_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    integrity_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    updated_by_user_id: {
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
    tableName: "ai_configurations",
    modelName: "AIConfiguration",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
