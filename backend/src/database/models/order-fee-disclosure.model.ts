import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type OrderFeeType =
  | "cooperative_service_fee"
  | "agent_service_fee"
  | "platform_commission"
  | "other";

export class OrderFeeDisclosure extends Model<
  InferAttributes<OrderFeeDisclosure>,
  InferCreationAttributes<OrderFeeDisclosure>
> {
  declare id: CreationOptional<string>;
  declare order_id: string;
  declare cooperative_id: CreationOptional<string | null>;
  declare agent_user_id: CreationOptional<string | null>;
  declare fee_type: OrderFeeType;
  declare amount_minor: string;
  declare currency: string;
  declare description: CreationOptional<string | null>;
  declare disclosed_at: CreationOptional<Date>;
  declare agreed_by_farmer_user_id: CreationOptional<string | null>;
  declare agreed_at: CreationOptional<Date | null>;
  declare farmer_approval_id: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

OrderFeeDisclosure.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    order_id: { type: DataTypes.UUID, allowNull: false },
    cooperative_id: { type: DataTypes.UUID, allowNull: true },
    agent_user_id: { type: DataTypes.UUID, allowNull: true },
    fee_type: {
      type: DataTypes.ENUM(
        "cooperative_service_fee",
        "agent_service_fee",
        "platform_commission",
        "other",
      ),
      allowNull: false,
    },
    amount_minor: { type: DataTypes.BIGINT, allowNull: false },
    currency: { type: DataTypes.STRING(10), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    disclosed_at: { type: DataTypes.DATE, allowNull: false },
    agreed_by_farmer_user_id: { type: DataTypes.UUID, allowNull: true },
    agreed_at: { type: DataTypes.DATE, allowNull: true },
    farmer_approval_id: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "order_fee_disclosures",
    modelName: "OrderFeeDisclosure",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
