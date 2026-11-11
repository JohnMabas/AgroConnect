import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type IntegrityRiskCategory =
  | "price_anomaly"
  | "duplicate_listing"
  | "review_manipulation"
  | "payment_abuse"
  | "spam_activity"
  | "verification_anomaly"
  | "unauthorized_access"
  | "approval_bypass"
  | "price_manipulation"
  | "quantity_manipulation"
  | "payment_destination_manipulation"
  | "consent_violation"
  | "cooperative_misconduct"
  | "other";

export type IntegrityRiskLevel = "low" | "medium" | "high" | "critical";

export type IntegrityDetectionMethod =
  | "rule_based"
  | "ai_assisted"
  | "hybrid";

export type IntegrityReviewStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "false_positive"
  | "escalated";

export interface IntegrityReason {
  category: IntegrityRiskCategory;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
}

export interface IntegrityEvidence {
  type: string;
  reference_id: string | null;
  summary: string;
  values?: Record<string, unknown>;
}

export class IntegrityAssessment extends Model<
  InferAttributes<IntegrityAssessment>,
  InferCreationAttributes<IntegrityAssessment>
> {
  declare id: CreationOptional<string>;
  declare subject_user_id: string;
  declare related_entity_type: CreationOptional<string | null>;
  declare related_entity_id: CreationOptional<string | null>;
  declare risk_category: IntegrityRiskCategory;
  declare risk_score: number;
  declare risk_level: IntegrityRiskLevel;
  declare detection_method: CreationOptional<IntegrityDetectionMethod>;
  declare reasons: CreationOptional<IntegrityReason[]>;
  declare evidence: CreationOptional<IntegrityEvidence[]>;
  declare review_status: CreationOptional<IntegrityReviewStatus>;
  declare assigned_admin_user_id: CreationOptional<string | null>;
  declare reviewed_by_user_id: CreationOptional<string | null>;
  declare reviewed_at: CreationOptional<Date | null>;
  declare resolution_note: CreationOptional<string | null>;
  declare false_positive: CreationOptional<boolean>;
  declare dedupe_key: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

IntegrityAssessment.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    subject_user_id: {
      type: DataTypes.UUID,
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
    risk_category: {
      type: DataTypes.ENUM(
        "price_anomaly",
        "duplicate_listing",
        "review_manipulation",
        "payment_abuse",
        "spam_activity",
        "verification_anomaly",
        "unauthorized_access",
        "approval_bypass",
        "price_manipulation",
        "quantity_manipulation",
        "payment_destination_manipulation",
        "consent_violation",
        "cooperative_misconduct",
        "other",
      ),
      allowNull: false,
    },
    risk_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    risk_level: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
      defaultValue: "low",
    },
    detection_method: {
      type: DataTypes.ENUM("rule_based", "ai_assisted", "hybrid"),
      allowNull: false,
      defaultValue: "rule_based",
    },
    reasons: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    evidence: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    review_status: {
      type: DataTypes.ENUM(
        "pending",
        "under_review",
        "resolved",
        "false_positive",
        "escalated",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    assigned_admin_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolution_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    false_positive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    dedupe_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
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
    tableName: "integrity_assessments",
    modelName: "IntegrityAssessment",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
