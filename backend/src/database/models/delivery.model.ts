import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed";

export class Delivery extends Model<
  InferAttributes<Delivery>,
  InferCreationAttributes<Delivery>
> {
  declare id: CreationOptional<string>;
  declare delivery_reference: string;
  declare order_id: string;
  declare farmer_id: string;
  declare buyer_id: string;
  declare transporter_id: CreationOptional<string | null>;
  declare pickup_location: string;
  declare delivery_location: string;
  declare produce_description: string;
  declare quantity: number;
  declare unit: string;
  declare expected_pickup_date: string;
  declare expected_delivery_date: string;
  declare delivery_fee_minor: number;
  declare currency: CreationOptional<string>;
  declare additional_instructions: CreationOptional<string | null>;
  declare status: CreationOptional<DeliveryStatus>;
  declare created_by_user_id: CreationOptional<string | null>;
  declare assigned_at: CreationOptional<Date | null>;
  declare accepted_at: CreationOptional<Date | null>;
  declare picked_up_at: CreationOptional<Date | null>;
  declare delivered_at: CreationOptional<Date | null>;
  declare completed_at: CreationOptional<Date | null>;
  declare cancelled_at: CreationOptional<Date | null>;
  declare failed_at: CreationOptional<Date | null>;
  declare cancellation_reason: CreationOptional<string | null>;
  declare failure_reason: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Delivery.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    delivery_reference: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    farmer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    buyer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transporter_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    pickup_location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    delivery_location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    produce_description: {
      type: DataTypes.TEXT,
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
    expected_pickup_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    expected_delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    delivery_fee_minor: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    additional_instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "assigned",
        "accepted",
        "picked_up",
        "in_transit",
        "delivered",
        "completed",
        "cancelled",
        "failed",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    picked_up_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    failure_reason: {
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
    tableName: "deliveries",
    modelName: "Delivery",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
