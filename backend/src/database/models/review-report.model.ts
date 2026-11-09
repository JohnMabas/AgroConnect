import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type ReviewReportReason =
  | "abusive_language"
  | "harassment"
  | "spam"
  | "false_misleading"
  | "personal_information"
  | "other";

export type ReviewReportStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "dismissed";

export class ReviewReport extends Model<
  InferAttributes<ReviewReport>,
  InferCreationAttributes<ReviewReport>
> {
  declare id: CreationOptional<string>;
  declare review_id: string;
  declare reporter_id: string;
  declare reason: ReviewReportReason;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<ReviewReportStatus>;
  declare reviewed_by: CreationOptional<string | null>;
  declare resolution_note: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ReviewReport.init(
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
    reporter_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.ENUM(
        "abusive_language",
        "harassment",
        "spam",
        "false_misleading",
        "personal_information",
        "other",
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "under_review",
        "resolved",
        "dismissed",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resolution_note: {
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
    tableName: "review_reports",
    modelName: "ReviewReport",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
