import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export class ComplaintEvidence extends Model<
  InferAttributes<ComplaintEvidence>,
  InferCreationAttributes<ComplaintEvidence>
> {
  declare id: CreationOptional<string>;
  declare complaint_id: string;
  declare uploaded_by_user_id: string;
  declare file_reference: string;
  declare original_file_name: string;
  declare file_type: string;
  declare file_size_bytes: number;
  declare description: CreationOptional<string | null>;
  declare checksum_sha256: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ComplaintEvidence.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    complaint_id: { type: DataTypes.UUID, allowNull: false },
    uploaded_by_user_id: { type: DataTypes.UUID, allowNull: false },
    file_reference: { type: DataTypes.STRING(500), allowNull: false },
    original_file_name: { type: DataTypes.STRING(255), allowNull: false },
    file_type: { type: DataTypes.STRING(100), allowNull: false },
    file_size_bytes: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    checksum_sha256: { type: DataTypes.STRING(64), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "complaint_evidence",
    modelName: "ComplaintEvidence",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
