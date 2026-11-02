import {
  DataTypes,
  Model,
  ValidationError,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { env } from "../../config/env.js";
import { normalizeEmail, normalizePhoneNumber } from "../../utils/contact.js";
import { sequelize } from "../sequelize.js";

export type UserStatus = "pending" | "active" | "suspended";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare display_name: CreationOptional<string | null>;
  declare phone_number: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare status: CreationOptional<UserStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    display_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "suspended"),
      allowNull: false,
      defaultValue: "pending",
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
    tableName: "users",
    modelName: "User",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    hooks: {
      beforeValidate: (user) => {
        user.email = normalizeEmail(user.email);
        user.phone_number = normalizePhoneNumber(
          user.phone_number,
          env.DEFAULT_PHONE_COUNTRY,
        );

        if (user.email === null && user.phone_number === null) {
          throw new ValidationError(
            "At least one of phone_number or email is required.",
            [],
          );
        }
      },
    },
  },
);
