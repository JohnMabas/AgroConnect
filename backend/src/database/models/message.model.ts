import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type MessageType = "text";
export type MessageStatus = "sent" | "delivered" | "read";

export class Message extends Model<
  InferAttributes<Message>,
  InferCreationAttributes<Message>
> {
  declare id: CreationOptional<string>;
  declare conversation_id: string;
  declare sender_user_id: string;
  declare content: string;
  declare message_type: CreationOptional<MessageType>;
  declare status: CreationOptional<MessageStatus>;
  declare delivered_at: CreationOptional<Date | null>;
  declare read_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Message.init(
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
    sender_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    message_type: {
      type: DataTypes.ENUM("text"),
      allowNull: false,
      defaultValue: "text",
    },
    status: {
      type: DataTypes.ENUM("sent", "delivered", "read"),
      allowNull: false,
      defaultValue: "sent",
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    read_at: {
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
    tableName: "messages",
    modelName: "Message",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
