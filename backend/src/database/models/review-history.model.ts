import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type ReviewHistoryAction =
  | "created"
  | "edited"
  | "reported"
  | "report_status_changed"
  | "hidden"
  | "restored";

export class ReviewHistory extends Model<
  InferAttributes<ReviewHistory>,
  InferCreationAttributes<ReviewHistory>
> {
  declare id: CreationOptional<string>;
  declare review_id: string;
  declare report_id: CreationOptional<string | null>;
  declare actor_user_id: CreationOptional<string | null>;
  declare action: ReviewHistoryAction;
  declare previous_rating: CreationOptional<number | null>;
  declare new_rating: CreationOptional<number | null>;
  declare previous_title: CreationOptional<string | null>;
  declare new_title: CreationOptional<string | null>;
  declare previous_comment: CreationOptional<string | null>;
  declare new_comment: CreationOptional<string | null>;
  declare note: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

ReviewHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    review_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    report_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM(
        "created",
        "edited",
        "reported",
        "report_status_changed",
        "hidden",
        "restored",
      ),
      allowNull: false,
    },
    previous_rating: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    new_rating: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    previous_title: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    new_title: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    previous_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
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
    tableName: "review_history",
    modelName: "ReviewHistory",
    underscored: true,
    timestamps: false,
  },
);
