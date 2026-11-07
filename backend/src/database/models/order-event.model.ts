import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class OrderEvent extends Model<
  InferAttributes<OrderEvent>,
  InferCreationAttributes<OrderEvent>
> {
  declare id: CreationOptional<string>;
  declare order_id: string;
  declare actor_user_id: CreationOptional<string | null>;
  declare action: string;
  declare previous_status: CreationOptional<string | null>;
  declare new_status: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

OrderEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    order_id: {
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
    tableName: "order_events",
    modelName: "OrderEvent",
    underscored: true,
    timestamps: false,
  },
);
