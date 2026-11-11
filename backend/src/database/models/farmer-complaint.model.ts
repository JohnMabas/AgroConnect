import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type FarmerComplaintCategory =
  | "unauthorized_account_access"
  | "price_manipulation"
  | "quantity_manipulation"
  | "false_produce_listing"
  | "unauthorized_offer_acceptance"
  | "unauthorized_transaction_change"
  | "payment_fraud"
  | "hidden_commission"
  | "agent_intimidation"
  | "data_misuse"
  | "cooperative_misconduct"
  | "poor_agent_conduct"
  | "other";

export type FarmerComplaintStatus =
  | "submitted"
  | "acknowledged"
  | "under_review"
  | "awaiting_information"
  | "resolved"
  | "dismissed"
  | "escalated";

export type FarmerComplaintPriority = "low" | "normal" | "high" | "urgent";

export class FarmerComplaint extends Model<
  InferAttributes<FarmerComplaint>,
  InferCreationAttributes<FarmerComplaint>
> {
  declare id: CreationOptional<string>;
  declare complaint_number: string;
  declare farmer_user_id: string;
  declare agent_user_id: CreationOptional<string | null>;
  declare cooperative_id: CreationOptional<string | null>;
  declare related_order_id: CreationOptional<string | null>;
  declare related_listing_id: CreationOptional<string | null>;
  declare category: FarmerComplaintCategory;
  declare description: string;
  declare status: CreationOptional<FarmerComplaintStatus>;
  declare priority: CreationOptional<FarmerComplaintPriority>;
  declare assigned_admin_user_id: CreationOptional<string | null>;
  declare resolution: CreationOptional<string | null>;
  declare resolved_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

FarmerComplaint.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    complaint_number: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    farmer_user_id: { type: DataTypes.UUID, allowNull: false },
    agent_user_id: { type: DataTypes.UUID, allowNull: true },
    cooperative_id: { type: DataTypes.UUID, allowNull: true },
    related_order_id: { type: DataTypes.UUID, allowNull: true },
    related_listing_id: { type: DataTypes.UUID, allowNull: true },
    category: {
      type: DataTypes.ENUM(
        "unauthorized_account_access",
        "price_manipulation",
        "quantity_manipulation",
        "false_produce_listing",
        "unauthorized_offer_acceptance",
        "unauthorized_transaction_change",
        "payment_fraud",
        "hidden_commission",
        "agent_intimidation",
        "data_misuse",
        "cooperative_misconduct",
        "poor_agent_conduct",
        "other",
      ),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "submitted",
        "acknowledged",
        "under_review",
        "awaiting_information",
        "resolved",
        "dismissed",
        "escalated",
      ),
      allowNull: false,
      defaultValue: "submitted",
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high", "urgent"),
      allowNull: false,
      defaultValue: "normal",
    },
    assigned_admin_user_id: { type: DataTypes.UUID, allowNull: true },
    resolution: { type: DataTypes.TEXT, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "farmer_complaints",
    modelName: "FarmerComplaint",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
