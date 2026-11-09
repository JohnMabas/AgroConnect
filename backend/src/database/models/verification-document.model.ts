import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

export type VerificationDocumentType =
  | "identity_document"
  | "business_registration"
  | "transport_permit"
  | "cooperative_certificate"
  | "supporting_document";

export class VerificationDocument extends Model<
  InferAttributes<VerificationDocument>,
  InferCreationAttributes<VerificationDocument>
> {
  declare id: CreationOptional<string>;
  declare verification_id: string;
  declare uploaded_by_user_id: string;
  declare document_type: VerificationDocumentType;
  declare original_file_name: string;
  declare storage_key: string;
  declare mime_type: string;
  declare file_size_bytes: number;
  declare checksum_sha256: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

VerificationDocument.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    verification_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    uploaded_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    document_type: {
      type: DataTypes.ENUM(
        "identity_document",
        "business_registration",
        "transport_permit",
        "cooperative_certificate",
        "supporting_document",
      ),
      allowNull: false,
      defaultValue: "supporting_document",
    },
    original_file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    storage_key: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    file_size_bytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    checksum_sha256: {
      type: DataTypes.STRING(64),
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
    tableName: "verification_documents",
    modelName: "VerificationDocument",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
