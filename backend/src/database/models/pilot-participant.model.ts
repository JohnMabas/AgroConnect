import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type PilotParticipantType =
  | "farmer"
  | "buyer"
  | "cooperative"
  | "cooperative_agent"
  | "transporter"
  | "administrator";

export type PilotParticipantStatus =
  | "invited"
  | "pending_consent"
  | "approved"
  | "active"
  | "suspended"
  | "removed";

export class PilotParticipant extends Model<
  InferAttributes<PilotParticipant>,
  InferCreationAttributes<PilotParticipant>
> {
  declare id: CreationOptional<string>;
  declare pilot_configuration_id: string;
  declare user_id: string;
  declare participant_type: PilotParticipantType;
  declare status: CreationOptional<PilotParticipantStatus>;
  declare consent_given_at: CreationOptional<Date | null>;
  declare consent_version: CreationOptional<string | null>;
  declare approved_by_user_id: CreationOptional<string | null>;
  declare approved_at: CreationOptional<Date | null>;
  declare notes: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

PilotParticipant.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    pilot_configuration_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    participant_type: {
      type: DataTypes.ENUM(
        "farmer",
        "buyer",
        "cooperative",
        "cooperative_agent",
        "transporter",
        "administrator",
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "invited",
        "pending_consent",
        "approved",
        "active",
        "suspended",
        "removed",
      ),
      allowNull: false,
      defaultValue: "invited",
    },
    consent_given_at: { type: DataTypes.DATE, allowNull: true },
    consent_version: { type: DataTypes.STRING(50), allowNull: true },
    approved_by_user_id: { type: DataTypes.UUID, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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
    tableName: "pilot_participants",
    modelName: "PilotParticipant",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
