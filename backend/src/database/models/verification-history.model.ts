import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type VerificationHistoryAction =
  | "submitted"
  | "approved"
  | "rejected"
  | "expired";

export class VerificationHistory extends Model<
  InferAttributes<VerificationHistory>,
  InferCreationAttributes<VerificationHistory>
> {
  declare id: CreationOptional<string>;
  declare verification_id: string;
  declare actor_user_id: CreationOptional<string | null>;
  declare action: VerificationHistoryAction;
  declare previous_status: CreationOptional<string | null>;
  declare new_status: string;
  declare reason: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

VerificationHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    verification_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM("submitted", "approved", "rejected", "expired"),
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    reason: {
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
    tableName: "verification_history",
    modelName: "VerificationHistory",
    underscored: true,
    timestamps: false,
  },
);
