import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

// Append-only record of administrative actions. No updated_at column —
// audit entries must never be silently rewritten from the admin interface.
export class AdminAuditLog extends Model<
  InferAttributes<AdminAuditLog>,
  InferCreationAttributes<AdminAuditLog>
> {
  declare id: CreationOptional<string>;
  declare admin_user_id: string | null;
  declare action: string;
  declare entity_type: string;
  declare entity_id: string | null;
  declare reason: string | null;
  declare result: string | null;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

AdminAuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    admin_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    result: {
      type: DataTypes.STRING(60),
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
    tableName: "admin_audit_logs",
    modelName: "AdminAuditLog",
    underscored: true,
    timestamps: false,
  },
);
