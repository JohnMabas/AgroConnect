import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class ComplaintInvestigation extends Model<
  InferAttributes<ComplaintInvestigation>,
  InferCreationAttributes<ComplaintInvestigation>
> {
  declare id: CreationOptional<string>;
  declare complaint_id: string;
  declare admin_user_id: string;
  declare action: string;
  declare notes: CreationOptional<string | null>;
  declare decision: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
}

ComplaintInvestigation.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    complaint_id: { type: DataTypes.UUID, allowNull: false },
    admin_user_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING(60), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    decision: { type: DataTypes.STRING(60), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "complaint_investigations",
    modelName: "ComplaintInvestigation",
    underscored: true,
    timestamps: false,
  },
);
