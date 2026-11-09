import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type IntegrityReviewAction =
  | "review_started"
  | "resolved"
  | "false_positive"
  | "escalated"
  | "note_added";

export class IntegrityReviewHistory extends Model<
  InferAttributes<IntegrityReviewHistory>,
  InferCreationAttributes<IntegrityReviewHistory>
> {
  declare id: CreationOptional<string>;
  declare assessment_id: string;
  declare admin_user_id: string;
  declare action: IntegrityReviewAction;
  declare from_status: string | null;
  declare to_status: string;
  declare notes: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

IntegrityReviewHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    assessment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    admin_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM(
        "review_started",
        "resolved",
        "false_positive",
        "escalated",
        "note_added",
      ),
      allowNull: false,
    },
    from_status: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    to_status: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    notes: {
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
    tableName: "integrity_review_history",
    modelName: "IntegrityReviewHistory",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
