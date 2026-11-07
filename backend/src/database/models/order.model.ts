import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_for_delivery"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "payment_failed"
  | "refunded";

export type OrderPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export class Order extends Model<
  InferAttributes<Order>,
  InferCreationAttributes<Order>
> {
  declare id: CreationOptional<string>;
  declare order_number: string;
  declare offer_id: string;
  declare listing_id: CreationOptional<string | null>;
  declare buyer_id: string;
  declare farmer_id: string;
  declare quantity: number;
  declare unit: string;
  declare unit_price: number;
  declare total_amount: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<OrderStatus>;
  declare payment_status: CreationOptional<OrderPaymentStatus>;
  declare delivery_terms: CreationOptional<string | null>;
  declare delivery_location: CreationOptional<string | null>;
  declare delivery_date: CreationOptional<string | null>;
  declare buyer_message: CreationOptional<string | null>;
  declare reservation_expires_at: CreationOptional<Date | null>;
  declare paid_at: CreationOptional<Date | null>;
  declare cancelled_at: CreationOptional<Date | null>;
  declare completed_at: CreationOptional<Date | null>;
  declare refunded_at: CreationOptional<Date | null>;
  declare cancellation_reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    order_number: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    offer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    buyer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    farmer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    unit_price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    status: {
      type: DataTypes.ENUM(
        "pending_payment",
        "paid",
        "processing",
        "ready_for_delivery",
        "in_transit",
        "delivered",
        "completed",
        "cancelled",
        "payment_failed",
        "refunded",
      ),
      allowNull: false,
      defaultValue: "pending_payment",
    },
    payment_status: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    delivery_terms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    delivery_location: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    buyer_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reservation_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellation_reason: {
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
    tableName: "orders",
    modelName: "Order",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
