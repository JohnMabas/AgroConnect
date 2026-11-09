import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const VERIFICATION_TYPES = [
  "phone",
  "email",
  "farmer_identity",
  "buyer_business",
  "transporter",
  "cooperative",
] as const;

const VERIFICATION_STATUSES = [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;

const DOCUMENT_TYPES = [
  "identity_document",
  "business_registration",
  "transport_permit",
  "cooperative_certificate",
  "supporting_document",
] as const;

const HISTORY_ACTIONS = [
  "submitted",
  "approved",
  "rejected",
  "expired",
] as const;

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("verifications", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    verification_type: {
      type: DataTypes.ENUM(...VERIFICATION_TYPES),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...VERIFICATION_STATUSES),
      allowNull: false,
      defaultValue: "not_submitted",
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("verifications", ["user_id", "verification_type"], {
    name: "verifications_user_type_unique",
    unique: true,
  });
  await queryInterface.addIndex("verifications", ["status", "created_at"], {
    name: "verifications_status_created_idx",
  });
  await queryInterface.addIndex("verifications", ["reviewed_by"], {
    name: "verifications_reviewer_idx",
  });

  await queryInterface.createTable("verification_documents", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    verification_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "verifications", key: "id" },
      onDelete: "CASCADE",
    },
    uploaded_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    document_type: {
      type: DataTypes.ENUM(...DOCUMENT_TYPES),
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
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex(
    "verification_documents",
    ["verification_id", "created_at"],
    { name: "verification_documents_verification_created_idx" },
  );
  await queryInterface.addIndex("verification_documents", ["uploaded_by_user_id"], {
    name: "verification_documents_uploader_idx",
  });
  await queryInterface.addIndex("verification_documents", ["storage_key"], {
    name: "verification_documents_storage_key_unique",
    unique: true,
  });

  await queryInterface.createTable("verification_history", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    verification_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "verifications", key: "id" },
      onDelete: "CASCADE",
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    action: {
      type: DataTypes.ENUM(...HISTORY_ACTIONS),
      allowNull: false,
    },
    previous_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
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
  });

  await queryInterface.addIndex(
    "verification_history",
    ["verification_id", "created_at"],
    { name: "verification_history_verification_created_idx" },
  );
  await queryInterface.addIndex("verification_history", ["actor_user_id"], {
    name: "verification_history_actor_idx",
  });
  await queryInterface.addIndex("verification_history", ["action"], {
    name: "verification_history_action_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("verification_history");
  await queryInterface.dropTable("verification_documents");
  await queryInterface.dropTable("verifications");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_verifications_verification_type"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_verifications_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_verification_documents_document_type"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_verification_history_action"',
  );
}
