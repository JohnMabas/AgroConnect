import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class PasswordResetToken extends Model<
  InferAttributes<PasswordResetToken>,
  InferCreationAttributes<PasswordResetToken>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare email: string | null;
  declare phone_number: string | null;
  declare token_hash: string;
  declare attempts: CreationOptional<number>;
  declare expires_at: Date;
  declare used: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

PasswordResetToken.init(
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
    email: {
      type: DataTypes.STRING(254),
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: "password_reset_tokens",
    modelName: "PasswordResetToken",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
