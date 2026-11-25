import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class DeliveryLocationPing extends Model<
  InferAttributes<DeliveryLocationPing>,
  InferCreationAttributes<DeliveryLocationPing>
> {
  declare id: CreationOptional<string>;
  declare delivery_id: string;
  declare reporter_user_id: string;
  declare latitude: number;
  declare longitude: number;
  declare accuracy_meters: CreationOptional<number | null>;
  declare recorded_at: Date;
  declare created_at: CreationOptional<Date>;
}

DeliveryLocationPing.init(
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
    reporter_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    accuracy_meters: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "delivery_location_pings",
    modelName: "DeliveryLocationPing",
    underscored: true,
    timestamps: false,
    createdAt: "created_at",
    updatedAt: false,
  },
);
