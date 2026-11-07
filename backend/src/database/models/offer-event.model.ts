import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class OfferEvent extends Model<
  InferAttributes<OfferEvent>,
  InferCreationAttributes<OfferEvent>
> {
  declare id: CreationOptional<string>;
  declare offer_id: string;
  declare actor_user_id: CreationOptional<string | null>;
  declare action: string;
  declare previous_status: CreationOptional<string | null>;
  declare new_status: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

OfferEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    offer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "offer_events",
    modelName: "OfferEvent",
    underscored: true,
    timestamps: false,
  },
);
