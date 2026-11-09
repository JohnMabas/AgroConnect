import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type AIConversationCategory =
  | "agroconnect_support"
  | "agriculture"
  | "market_intelligence"
  | "general";

export type AIConversationStatus = "active" | "archived";

export class AIConversation extends Model<
  InferAttributes<AIConversation>,
  InferCreationAttributes<AIConversation>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare title: string;
  declare category: CreationOptional<AIConversationCategory>;
  declare status: CreationOptional<AIConversationStatus>;
  declare last_message_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

AIConversation.init(
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(
        "agroconnect_support",
        "agriculture",
        "market_intelligence",
        "general",
      ),
      allowNull: false,
      defaultValue: "general",
    },
    status: {
      type: DataTypes.ENUM("active", "archived"),
      allowNull: false,
      defaultValue: "active",
    },
    last_message_at: {
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
    tableName: "ai_conversations",
    modelName: "AIConversation",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
