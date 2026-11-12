import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type UssdResponseType = "CON" | "END";

export class UssdSessionEvent extends Model<
  InferAttributes<UssdSessionEvent>,
  InferCreationAttributes<UssdSessionEvent>
> {
  declare id: CreationOptional<string>;
  declare ussd_session_id: string;
  declare event_key: string;
  declare menu_key: string;
  declare input_hash: CreationOptional<string | null>;
  declare response_type: UssdResponseType;
  declare response_text: string;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

UssdSessionEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    ussd_session_id: { type: DataTypes.UUID, allowNull: false },
    event_key: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    menu_key: { type: DataTypes.STRING(60), allowNull: false },
    input_hash: { type: DataTypes.STRING(64), allowNull: true },
    response_type: {
      type: DataTypes.ENUM("CON", "END"),
      allowNull: false,
    },
    response_text: { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "ussd_session_events",
    modelName: "UssdSessionEvent",
    underscored: true,
    timestamps: false,
  },
);
