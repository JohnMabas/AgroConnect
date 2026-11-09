import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class Review extends Model<
  InferAttributes<Review>,
  InferCreationAttributes<Review>
> {
  declare id: CreationOptional<string>;
  declare reviewer_id: string;
  declare reviewed_user_id: string;
  declare order_id: string;
  declare delivery_id: CreationOptional<string | null>;
  declare rating: number;
  declare review_title: CreationOptional<string | null>;
  declare review_comment: CreationOptional<string | null>;
  declare is_hidden: CreationOptional<boolean>;
  declare hidden_reason: CreationOptional<string | null>;
  declare hidden_by_user_id: CreationOptional<string | null>;
  declare hidden_at: CreationOptional<Date | null>;
  declare edited_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Review.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    reviewer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewed_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    delivery_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rating: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    review_title: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    review_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_hidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hidden_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hidden_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    hidden_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    edited_at: {
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
    tableName: "reviews",
    modelName: "Review",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
