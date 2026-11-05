import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

// Immutable audit log — no updated_at column. timestamps: false prevents
// Sequelize from attempting to manage updatedAt automatically.

export type AdjustmentType = "stock_added" | "stock_removed" | "correction";

export class InventoryAdjustment extends Model<
  InferAttributes<InventoryAdjustment>,
  InferCreationAttributes<InventoryAdjustment>
> {
  declare id: CreationOptional<string>;
  declare listing_id: string;
  declare farmer_user_id: string;
  declare adjustment_type: AdjustmentType;
  declare quantity_change: number;
  declare previous_available_quantity: number;
  declare new_available_quantity: number;
  declare reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

InventoryAdjustment.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    adjustment_type: {
      type: DataTypes.ENUM("stock_added", "stock_removed", "correction"),
      allowNull: false,
    },
    quantity_change: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    previous_available_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    new_available_quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
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
    tableName: "inventory_adjustments",
    modelName: "InventoryAdjustment",
    underscored: true,
    timestamps: false,
  },
);
