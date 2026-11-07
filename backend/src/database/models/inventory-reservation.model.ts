import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type ReservationStatus =
  | "active"
  | "released"
  | "expired"
  | "consumed"
  | "void";

export class InventoryReservation extends Model<
  InferAttributes<InventoryReservation>,
  InferCreationAttributes<InventoryReservation>
> {
  declare id: CreationOptional<string>;
  declare order_id: string;
  declare listing_id: string;
  declare quantity: number;
  declare status: CreationOptional<ReservationStatus>;
  declare expires_at: Date;
  declare released_at: CreationOptional<Date | null>;
  declare release_reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

InventoryReservation.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "active",
        "released",
        "expired",
        "consumed",
        "void",
      ),
      allowNull: false,
      defaultValue: "active",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    released_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    release_reason: {
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
    tableName: "inventory_reservations",
    modelName: "InventoryReservation",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
