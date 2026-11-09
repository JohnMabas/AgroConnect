import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type RecommendationType =
  | "listing"
  | "buyer_request"
  | "market_opportunity"
  | "price_alert"
  | "platform_action";

export type RecommendationStatus =
  | "active"
  | "dismissed"
  | "completed"
  | "expired";

export class Recommendation extends Model<
  InferAttributes<Recommendation>,
  InferCreationAttributes<Recommendation>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare recommendation_type: RecommendationType;
  declare title: string;
  declare summary: string;
  declare reason: string;
  declare related_entity_type: CreationOptional<string | null>;
  declare related_entity_id: CreationOptional<string | null>;
  declare score: CreationOptional<number>;
  declare status: CreationOptional<RecommendationStatus>;
  declare expires_at: CreationOptional<Date | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare dedupe_key: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Recommendation.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    recommendation_type: {
      type: DataTypes.ENUM(
        "listing",
        "buyer_request",
        "market_opportunity",
        "price_alert",
        "platform_action",
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    related_entity_type: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    related_entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    score: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "dismissed", "completed", "expired"),
      allowNull: false,
      defaultValue: "active",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    dedupe_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    tableName: "recommendations",
    modelName: "Recommendation",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
