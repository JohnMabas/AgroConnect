import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type AIConversationMessageSender = "user" | "assistant" | "system";

export interface AIKnowledgeReference {
  knowledge_id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
}

export class AIConversationMessage extends Model<
  InferAttributes<AIConversationMessage>,
  InferCreationAttributes<AIConversationMessage>
> {
  declare id: CreationOptional<string>;
  declare conversation_id: string;
  declare sender: AIConversationMessageSender;
  declare content: string;
  declare safety_flags: CreationOptional<string[]>;
  declare knowledge_references: CreationOptional<AIKnowledgeReference[]>;
  declare provider: CreationOptional<string | null>;
  declare model: CreationOptional<string | null>;
  declare request_tokens: CreationOptional<number>;
  declare response_tokens: CreationOptional<number>;
  declare latency_ms: CreationOptional<number | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AIConversationMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender: {
      type: DataTypes.ENUM("user", "assistant", "system"),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    safety_flags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    knowledge_references: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    provider: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    request_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    response_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    latency_ms: {
      type: DataTypes.INTEGER,
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
    tableName: "ai_conversation_messages",
    modelName: "AIConversationMessage",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
