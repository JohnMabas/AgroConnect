import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type ConversationStatus = "active" | "archived" | "blocked";

export class Conversation extends Model<
  InferAttributes<Conversation>,
  InferCreationAttributes<Conversation>
> {
  declare id: CreationOptional<string>;
  declare created_by_user_id: string;
  declare listing_id: CreationOptional<string | null>;
  declare buyer_request_id: CreationOptional<string | null>;
  declare status: CreationOptional<ConversationStatus>;
  declare last_message_at: CreationOptional<Date | null>;
  declare dedupe_key: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    buyer_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "archived", "blocked"),
      allowNull: false,
      defaultValue: "active",
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Deterministic key used to prevent duplicate one-to-one conversations for
    // the same participant pair and marketplace context.
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
    tableName: "conversations",
    modelName: "Conversation",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
