import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export class Offer extends Model<
  InferAttributes<Offer>,
  InferCreationAttributes<Offer>
> {
  declare id: CreationOptional<string>;
  declare offer_number: string;
  declare listing_id: CreationOptional<string | null>;
  declare buyer_request_id: CreationOptional<string | null>;
  declare conversation_id: CreationOptional<string | null>;
  declare buyer_id: string;
  declare farmer_id: string;
  declare created_by: string;
  declare parent_offer_id: CreationOptional<string | null>;
  declare root_offer_id: CreationOptional<string | null>;
  declare quantity: number;
  declare unit: string;
  declare unit_price: number;
  declare total_amount: number;
  declare currency: CreationOptional<string>;
  declare delivery_terms: CreationOptional<string | null>;
  declare delivery_location: CreationOptional<string | null>;
  declare delivery_date: CreationOptional<string | null>;
  declare buyer_message: CreationOptional<string | null>;
  declare status: CreationOptional<OfferStatus>;
  declare expires_at: Date;
  declare accepted_at: CreationOptional<Date | null>;
  declare rejected_at: CreationOptional<Date | null>;
  declare withdrawn_at: CreationOptional<Date | null>;
  declare expired_at: CreationOptional<Date | null>;
  declare countered_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Offer.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    offer_number: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    buyer_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    conversation_id: {
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
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    parent_offer_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    root_offer_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    status: {
      type: DataTypes.ENUM(
        "pending",
        "countered",
        "accepted",
        "rejected",
        "withdrawn",
        "expired",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    withdrawn_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    countered_at: {
      type: DataTypes.DATE,
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
    tableName: "offers",
    modelName: "Offer",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
