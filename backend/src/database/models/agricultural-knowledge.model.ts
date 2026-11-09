import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type KnowledgeApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "archived";

export class AgriculturalKnowledge extends Model<
  InferAttributes<AgriculturalKnowledge>,
  InferCreationAttributes<AgriculturalKnowledge>
> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare summary: CreationOptional<string | null>;
  declare content: string;
  declare topic: string;
  declare crop: CreationOptional<string | null>;
  declare region: CreationOptional<string | null>;
  declare tags: CreationOptional<string[]>;
  declare source_name: CreationOptional<string | null>;
  declare source_url: CreationOptional<string | null>;
  declare publication_date: CreationOptional<string | null>;
  declare review_date: CreationOptional<string | null>;
  declare approval_status: CreationOptional<KnowledgeApprovalStatus>;
  declare safety_flags: CreationOptional<string[]>;
  declare created_by_user_id: string;
  declare approved_by_user_id: CreationOptional<string | null>;
  declare approved_at: CreationOptional<Date | null>;
  declare rejection_reason: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AgriculturalKnowledge.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    title: {
      type: DataTypes.STRING(250),
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    topic: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    crop: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    region: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    source_name: {
      type: DataTypes.STRING(250),
      allowNull: true,
    },
    source_url: {
      type: DataTypes.STRING(700),
      allowNull: true,
    },
    publication_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    review_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    approval_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "archived"),
      allowNull: false,
      defaultValue: "pending",
    },
    safety_flags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejection_reason: {
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
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "agricultural_knowledge",
    modelName: "AgriculturalKnowledge",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
