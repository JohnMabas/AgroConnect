import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class CooperativeAgentAssignment extends Model<
  InferAttributes<CooperativeAgentAssignment>,
  InferCreationAttributes<CooperativeAgentAssignment>
> {
  declare id: CreationOptional<string>;
  declare cooperative_id: string;
  declare agent_user_id: string;
  declare assigned_by_user_id: string;
  declare status: CreationOptional<"active" | "deactivated">;
  declare assigned_at: CreationOptional<Date>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

CooperativeAgentAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    assigned_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "deactivated"),
      allowNull: false,
      defaultValue: "active",
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: "cooperative_agent_assignments",
    modelName: "CooperativeAgentAssignment",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
