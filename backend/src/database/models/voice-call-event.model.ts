import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type VoiceCallAction =
  | "say"
  | "get_digits"
  | "redirect"
  | "hangup";

export class VoiceCallEvent extends Model<
  InferAttributes<VoiceCallEvent>,
  InferCreationAttributes<VoiceCallEvent>
> {
  declare id: CreationOptional<string>;
  declare voice_call_session_id: string;
  declare event_key: string;
  declare action: VoiceCallAction;
  declare input_digits_hash: CreationOptional<string | null>;
  declare response_xml: string;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

VoiceCallEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    voice_call_session_id: { type: DataTypes.UUID, allowNull: false },
    event_key: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    action: {
      type: DataTypes.ENUM("say", "get_digits", "redirect", "hangup"),
      allowNull: false,
    },
    input_digits_hash: { type: DataTypes.STRING(64), allowNull: true },
    response_xml: { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "voice_call_events",
    modelName: "VoiceCallEvent",
    underscored: true,
    timestamps: false,
  },
);
