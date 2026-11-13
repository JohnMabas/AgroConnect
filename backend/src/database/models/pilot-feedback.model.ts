import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";
import type { PilotParticipantType } from "./pilot-participant.model.js";

export type PilotFeedbackCategory =
  | "registration"
  | "listing"
  | "finding_buyers"
  | "communication"
  | "payment"
  | "delivery"
  | "ussd"
  | "voice"
  | "agent_misconduct"
  | "general";

export type PilotFeedbackSeverity = "low" | "normal" | "high" | "critical";

export type PilotFeedbackStatus =
  | "new"
  | "acknowledged"
  | "under_review"
  | "in_progress"
  | "resolved"
  | "closed";

export class PilotFeedback extends Model<
  InferAttributes<PilotFeedback>,
  InferCreationAttributes<PilotFeedback>
> {
  declare id: CreationOptional<string>;
  declare feedback_number: string;
  declare pilot_configuration_id: CreationOptional<string | null>;
  declare user_id: string;
  declare participant_type: CreationOptional<PilotParticipantType | null>;
  declare category: PilotFeedbackCategory;
  declare description: string;
  declare severity: CreationOptional<PilotFeedbackSeverity>;
  declare status: CreationOptional<PilotFeedbackStatus>;
  declare assigned_admin_user_id: CreationOptional<string | null>;
  declare resolution_notes: CreationOptional<string | null>;
  declare related_complaint_id: CreationOptional<string | null>;
  declare resolved_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

PilotFeedback.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    feedback_number: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    pilot_configuration_id: { type: DataTypes.UUID, allowNull: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    participant_type: {
      type: DataTypes.ENUM(
        "farmer",
        "buyer",
        "cooperative",
        "cooperative_agent",
        "transporter",
        "administrator",
      ),
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        "registration",
        "listing",
        "finding_buyers",
        "communication",
        "payment",
        "delivery",
        "ussd",
        "voice",
        "agent_misconduct",
        "general",
      ),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    severity: {
      type: DataTypes.ENUM("low", "normal", "high", "critical"),
      allowNull: false,
      defaultValue: "normal",
    },
    status: {
      type: DataTypes.ENUM(
        "new",
        "acknowledged",
        "under_review",
        "in_progress",
        "resolved",
        "closed",
      ),
      allowNull: false,
      defaultValue: "new",
    },
    assigned_admin_user_id: { type: DataTypes.UUID, allowNull: true },
    resolution_notes: { type: DataTypes.TEXT, allowNull: true },
    related_complaint_id: { type: DataTypes.UUID, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
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
    tableName: "pilot_feedback",
    modelName: "PilotFeedback",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
