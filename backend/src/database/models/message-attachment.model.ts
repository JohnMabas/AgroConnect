import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type MessageAttachmentType = "image" | "audio";

export class MessageAttachment extends Model<
  InferAttributes<MessageAttachment>,
  InferCreationAttributes<MessageAttachment>
> {
  declare id: CreationOptional<string>;
  declare message_id: string;
  declare conversation_id: string;
  declare uploader_user_id: string;
  declare attachment_type: MessageAttachmentType;
  declare storage_key: string;
  declare mime_type: string;
  declare file_name: string;
  declare file_size_bytes: number;
  declare duration_seconds: CreationOptional<number | null>;
  declare width: CreationOptional<number | null>;
  declare height: CreationOptional<number | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

MessageAttachment.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    message_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    uploader_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    attachment_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    storage_key: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_size_bytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    duration_seconds: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
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
    tableName: "message_attachments",
    modelName: "MessageAttachment",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
