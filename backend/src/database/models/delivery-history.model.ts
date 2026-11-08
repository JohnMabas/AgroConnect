import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class DeliveryHistory extends Model<
  InferAttributes<DeliveryHistory>,
  InferCreationAttributes<DeliveryHistory>
> {
  declare id: CreationOptional<string>;
  declare delivery_id: string;
  declare actor_user_id: CreationOptional<string | null>;
  declare action: string;
  declare previous_status: CreationOptional<string | null>;
  declare new_status: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare location: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

DeliveryHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    delivery_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "delivery_history",
    modelName: "DeliveryHistory",
    underscored: true,
    timestamps: false,
  },
);
