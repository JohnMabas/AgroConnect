import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const AGENT_PROFILES = "agent_profiles";
const AGENT_VERIFICATIONS = "agent_verification_records";
const RELATIONSHIPS = "farmer_agent_relationships";
const PERMISSIONS = "farmer_agent_permissions";
const CONSENT_RECORDS = "farmer_consent_records";
const APPROVALS = "farmer_action_approvals";
const COMPLAINTS = "farmer_complaints";
const EVIDENCE = "complaint_evidence";
const INVESTIGATIONS = "complaint_investigations";
const FEE_DISCLOSURES = "order_fee_disclosures";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  // ─── Extend existing cooperative statuses without destroying data ──────────
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_cooperative_profiles_verification_status"
       ADD VALUE IF NOT EXISTS 'under_review'`,
  );
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_cooperative_profiles_verification_status"
       ADD VALUE IF NOT EXISTS 'deactivated'`,
  );

  await queryInterface.addColumn("cooperative_profiles", "contact_person_name", {
    type: DataTypes.STRING(200),
    allowNull: true,
  });
  await queryInterface.addColumn("cooperative_profiles", "date_of_registration", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });

  // ─── Extend integrity risk categories (Phase 14 table, no duplicate) ──────
  for (const category of [
    "unauthorized_access",
    "approval_bypass",
    "price_manipulation",
    "quantity_manipulation",
    "payment_destination_manipulation",
    "consent_violation",
    "cooperative_misconduct",
  ]) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_integrity_assessments_risk_category"
         ADD VALUE IF NOT EXISTS '${category}'`,
    );
  }

  // ─── Extend the existing immutable activity log ───────────────────────────
  await queryInterface.changeColumn("agent_activity_logs", "agent_user_id", {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await queryInterface.changeColumn("agent_activity_logs", "farmer_user_id", {
    type: DataTypes.UUID,
    allowNull: true,
  });

  await queryInterface.addColumn("agent_activity_logs", "resource_type", {
    type: DataTypes.STRING(60),
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "resource_id", {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "previous_values", {
    type: DataTypes.JSONB,
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "new_values", {
    type: DataTypes.JSONB,
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "approval_required", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
  await queryInterface.addColumn("agent_activity_logs", "approval_id", {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "approval_status", {
    type: DataTypes.STRING(40),
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "action_result", {
    type: DataTypes.STRING(40),
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "ip_address", {
    type: DataTypes.STRING(64),
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "user_agent", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await queryInterface.addColumn("agent_activity_logs", "correlation_id", {
    type: DataTypes.STRING(100),
    allowNull: true,
  });

  await queryInterface.addIndex(
    "agent_activity_logs",
    ["cooperative_id", "created_at"],
    { name: "agent_activity_logs_coop_created_idx" },
  );
  await queryInterface.addIndex(
    "agent_activity_logs",
    ["resource_type", "resource_id"],
    { name: "agent_activity_logs_resource_idx" },
  );
  await queryInterface.addIndex("agent_activity_logs", ["approval_id"], {
    name: "agent_activity_logs_approval_idx",
  });
  await queryInterface.addIndex("agent_activity_logs", ["correlation_id"], {
    name: "agent_activity_logs_correlation_idx",
  });

  // ─── Agent profiles (cooperative-only agents) ──────────────────────────────
  await queryInterface.createTable(AGENT_PROFILES, {
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
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "CASCADE",
    },
    full_name: { type: DataTypes.STRING(200), allowNull: false },
    phone_number: { type: DataTypes.STRING(32), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: true },
    identity_verification_reference: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    operating_area: { type: DataTypes.STRING(200), allowNull: true },
    appointment_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        "invited",
        "pending_verification",
        "active",
        "suspended",
        "removed",
        "deactivated",
      ),
      allowNull: false,
      defaultValue: "invited",
    },
    verification_status: {
      type: DataTypes.ENUM(
        "pending",
        "under_review",
        "approved",
        "rejected",
        "suspended",
        "expired",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    code_of_conduct_version: { type: DataTypes.STRING(50), allowNull: true },
    code_of_conduct_accepted_at: { type: DataTypes.DATE, allowNull: true },
    invited_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    verified_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    verified_at: { type: DataTypes.DATE, allowNull: true },
    suspended_at: { type: DataTypes.DATE, allowNull: true },
    removed_at: { type: DataTypes.DATE, allowNull: true },
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

  await queryInterface.addConstraint(AGENT_PROFILES, {
    fields: ["user_id", "cooperative_id"],
    type: "unique",
    name: "agent_profiles_user_coop_unique",
  });
  await queryInterface.addIndex(AGENT_PROFILES, ["cooperative_id", "status"], {
    name: "agent_profiles_coop_status_idx",
  });
  await queryInterface.addIndex(AGENT_PROFILES, ["user_id", "status"], {
    name: "agent_profiles_user_status_idx",
  });
  await queryInterface.addIndex(
    AGENT_PROFILES,
    ["verification_status", "created_at"],
    { name: "agent_profiles_verification_idx" },
  );

  await queryInterface.createTable(AGENT_VERIFICATIONS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    agent_profile_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: AGENT_PROFILES, key: "id" },
      onDelete: "CASCADE",
    },
    submitted_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "under_review",
        "approved",
        "rejected",
        "suspended",
        "expired",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    identity_reference: { type: DataTypes.STRING(200), allowNull: true },
    documents: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    reviewed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
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
    AGENT_VERIFICATIONS,
    ["agent_profile_id", "created_at"],
    { name: "agent_verifications_profile_created_idx" },
  );
  await queryInterface.addIndex(AGENT_VERIFICATIONS, ["status", "created_at"], {
    name: "agent_verifications_status_created_idx",
  });

  // ─── Farmer-agent consent relationships ───────────────────────────────────
  await queryInterface.createTable(RELATIONSHIPS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "CASCADE",
    },
    agent_profile_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: AGENT_PROFILES, key: "id" },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "active",
        "suspended",
        "revoked",
        "expired",
        "rejected",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    consent_method: {
      type: DataTypes.ENUM(
        "in_app",
        "sms",
        "ussd",
        "voice",
        "cooperative_assisted",
        "admin",
      ),
      allowNull: false,
      defaultValue: "in_app",
    },
    requested_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    consent_given_at: { type: DataTypes.DATE, allowNull: true },
    consent_expires_at: { type: DataTypes.DATE, allowNull: true },
    consent_revoked_at: { type: DataTypes.DATE, allowNull: true },
    revoked_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
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

  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX farmer_agent_relationships_open_unique
       ON "${RELATIONSHIPS}" ("farmer_user_id", "agent_user_id", "cooperative_id")
       WHERE status IN ('pending', 'active', 'suspended')`,
  );
  await queryInterface.addIndex(RELATIONSHIPS, ["farmer_user_id", "status"], {
    name: "farmer_agent_relationships_farmer_status_idx",
  });
  await queryInterface.addIndex(RELATIONSHIPS, ["agent_user_id", "status"], {
    name: "farmer_agent_relationships_agent_status_idx",
  });
  await queryInterface.addIndex(
    RELATIONSHIPS,
    ["cooperative_id", "status"],
    { name: "farmer_agent_relationships_coop_status_idx" },
  );
  await queryInterface.addIndex(
    RELATIONSHIPS,
    ["agent_profile_id", "status"],
    { name: "farmer_agent_relationships_profile_status_idx" },
  );

  await queryInterface.createTable(PERMISSIONS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    relationship_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: RELATIONSHIPS, key: "id" },
      onDelete: "CASCADE",
    },
    permission_key: { type: DataTypes.STRING(80), allowNull: false },
    is_granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    granted_at: { type: DataTypes.DATE, allowNull: true },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    granted_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
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

  await queryInterface.addConstraint(PERMISSIONS, {
    fields: ["relationship_id", "permission_key"],
    type: "unique",
    name: "farmer_agent_permissions_relationship_key_unique",
  });

  await queryInterface.createTable(CONSENT_RECORDS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    relationship_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: RELATIONSHIPS, key: "id" },
      onDelete: "CASCADE",
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "CASCADE",
    },
    action: { type: DataTypes.STRING(60), allowNull: false },
    method: { type: DataTypes.STRING(40), allowNull: false },
    ip_address: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex(
    CONSENT_RECORDS,
    ["relationship_id", "created_at"],
    { name: "farmer_consent_records_relationship_idx" },
  );
  await queryInterface.addIndex(
    CONSENT_RECORDS,
    ["farmer_user_id", "created_at"],
    { name: "farmer_consent_records_farmer_idx" },
  );

  // ─── Farmer approval workflow ─────────────────────────────────────────────
  await queryInterface.createTable(APPROVALS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "CASCADE",
    },
    relationship_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: RELATIONSHIPS, key: "id" },
      onDelete: "SET NULL",
    },
    action_type: { type: DataTypes.STRING(60), allowNull: false },
    resource_type: { type: DataTypes.STRING(60), allowNull: false },
    resource_id: { type: DataTypes.UUID, allowNull: true },
    previous_values: { type: DataTypes.JSONB, allowNull: true },
    proposed_values: { type: DataTypes.JSONB, allowNull: false },
    proposed_values_hash: { type: DataTypes.STRING(64), allowNull: false },
    approval_status: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    approval_method: {
      type: DataTypes.ENUM("in_app", "sms", "ussd", "voice"),
      allowNull: false,
      defaultValue: "in_app",
    },
    evidence_reference: { type: DataTypes.STRING(255), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejected_at: { type: DataTypes.DATE, allowNull: true },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    applied_at: { type: DataTypes.DATE, allowNull: true },
    application_result: { type: DataTypes.JSONB, allowNull: true },
    failure_reason: { type: DataTypes.TEXT, allowNull: true },
    idempotency_key: { type: DataTypes.STRING(128), allowNull: false },
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

  await queryInterface.addConstraint(APPROVALS, {
    fields: ["idempotency_key"],
    type: "unique",
    name: "farmer_action_approvals_idempotency_unique",
  });
  await queryInterface.addIndex(APPROVALS, ["farmer_user_id", "approval_status"], {
    name: "farmer_action_approvals_farmer_status_idx",
  });
  await queryInterface.addIndex(APPROVALS, ["agent_user_id", "approval_status"], {
    name: "farmer_action_approvals_agent_status_idx",
  });
  await queryInterface.addIndex(APPROVALS, ["cooperative_id", "approval_status"], {
    name: "farmer_action_approvals_coop_status_idx",
  });
  await queryInterface.addIndex(APPROVALS, ["expires_at"], {
    name: "farmer_action_approvals_expiry_idx",
  });

  // ─── Complaints and evidence ──────────────────────────────────────────────
  await queryInterface.createTable(COMPLAINTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    complaint_number: { type: DataTypes.STRING(40), allowNull: false },
    farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "SET NULL",
    },
    related_order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "orders", key: "id" },
      onDelete: "SET NULL",
    },
    related_listing_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_listings", key: "id" },
      onDelete: "SET NULL",
    },
    category: {
      type: DataTypes.ENUM(
        "unauthorized_account_access",
        "price_manipulation",
        "quantity_manipulation",
        "false_produce_listing",
        "unauthorized_offer_acceptance",
        "unauthorized_transaction_change",
        "payment_fraud",
        "hidden_commission",
        "agent_intimidation",
        "data_misuse",
        "cooperative_misconduct",
        "poor_agent_conduct",
        "other",
      ),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "submitted",
        "acknowledged",
        "under_review",
        "awaiting_information",
        "resolved",
        "dismissed",
        "escalated",
      ),
      allowNull: false,
      defaultValue: "submitted",
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high", "urgent"),
      allowNull: false,
      defaultValue: "normal",
    },
    assigned_admin_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    resolution: { type: DataTypes.TEXT, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
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

  await queryInterface.addConstraint(COMPLAINTS, {
    fields: ["complaint_number"],
    type: "unique",
    name: "farmer_complaints_number_unique",
  });
  await queryInterface.addIndex(COMPLAINTS, ["farmer_user_id", "status"], {
    name: "farmer_complaints_farmer_status_idx",
  });
  await queryInterface.addIndex(COMPLAINTS, ["cooperative_id", "status"], {
    name: "farmer_complaints_coop_status_idx",
  });
  await queryInterface.addIndex(COMPLAINTS, ["agent_user_id", "status"], {
    name: "farmer_complaints_agent_status_idx",
  });
  await queryInterface.addIndex(COMPLAINTS, ["status", "priority", "created_at"], {
    name: "farmer_complaints_status_priority_idx",
  });

  await queryInterface.createTable(EVIDENCE, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    complaint_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: COMPLAINTS, key: "id" },
      onDelete: "CASCADE",
    },
    uploaded_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    file_reference: { type: DataTypes.STRING(500), allowNull: false },
    original_file_name: { type: DataTypes.STRING(255), allowNull: false },
    file_type: { type: DataTypes.STRING(100), allowNull: false },
    file_size_bytes: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    checksum_sha256: { type: DataTypes.STRING(64), allowNull: true },
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

  await queryInterface.addIndex(EVIDENCE, ["complaint_id", "created_at"], {
    name: "complaint_evidence_complaint_created_idx",
  });

  await queryInterface.createTable(INVESTIGATIONS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    complaint_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: COMPLAINTS, key: "id" },
      onDelete: "CASCADE",
    },
    admin_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    action: { type: DataTypes.STRING(60), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    decision: { type: DataTypes.STRING(60), allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex(
    INVESTIGATIONS,
    ["complaint_id", "created_at"],
    { name: "complaint_investigations_complaint_created_idx" },
  );

  // ─── Optional disclosed service fees (never auto-deducted) ────────────────
  await queryInterface.createTable(FEE_DISCLOSURES, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
      onDelete: "CASCADE",
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "SET NULL",
    },
    agent_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    fee_type: {
      type: DataTypes.ENUM(
        "cooperative_service_fee",
        "agent_service_fee",
        "platform_commission",
        "other",
      ),
      allowNull: false,
    },
    amount_minor: { type: DataTypes.BIGINT, allowNull: false },
    currency: { type: DataTypes.STRING(10), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    disclosed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    agreed_by_farmer_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    agreed_at: { type: DataTypes.DATE, allowNull: true },
    farmer_approval_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: APPROVALS, key: "id" },
      onDelete: "SET NULL",
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

  await queryInterface.addIndex(FEE_DISCLOSURES, ["order_id", "fee_type"], {
    name: "order_fee_disclosures_order_type_idx",
  });

  // ─── Append-only enforcement at the database layer ────────────────────────
  await queryInterface.sequelize.query(
    `CREATE OR REPLACE FUNCTION prevent_phase16_audit_mutation()
       RETURNS trigger AS $$
       BEGIN
         RAISE EXCEPTION 'This audit record is append-only and cannot be modified or deleted.';
       END;
       $$ LANGUAGE plpgsql`,
  );
  for (const table of [
    "agent_activity_logs",
    CONSENT_RECORDS,
    INVESTIGATIONS,
  ]) {
    await queryInterface.sequelize.query(
      `CREATE TRIGGER ${table}_append_only
         BEFORE UPDATE OR DELETE ON "${table}"
         FOR EACH ROW EXECUTE FUNCTION prevent_phase16_audit_mutation()`,
    );
  }
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  for (const table of [
    "agent_activity_logs",
    CONSENT_RECORDS,
    INVESTIGATIONS,
  ]) {
    await queryInterface.sequelize.query(
      `DROP TRIGGER IF EXISTS ${table}_append_only ON "${table}"`,
    );
  }
  await queryInterface.sequelize.query(
    "DROP FUNCTION IF EXISTS prevent_phase16_audit_mutation()",
  );

  await queryInterface.dropTable(FEE_DISCLOSURES);
  await queryInterface.dropTable(INVESTIGATIONS);
  await queryInterface.dropTable(EVIDENCE);
  await queryInterface.dropTable(COMPLAINTS);
  await queryInterface.dropTable(APPROVALS);
  await queryInterface.dropTable(CONSENT_RECORDS);
  await queryInterface.dropTable(PERMISSIONS);
  await queryInterface.dropTable(RELATIONSHIPS);
  await queryInterface.dropTable(AGENT_VERIFICATIONS);
  await queryInterface.dropTable(AGENT_PROFILES);

  await queryInterface.removeIndex(
    "agent_activity_logs",
    "agent_activity_logs_correlation_idx",
  );
  await queryInterface.removeIndex(
    "agent_activity_logs",
    "agent_activity_logs_approval_idx",
  );
  await queryInterface.removeIndex(
    "agent_activity_logs",
    "agent_activity_logs_resource_idx",
  );
  await queryInterface.removeIndex(
    "agent_activity_logs",
    "agent_activity_logs_coop_created_idx",
  );

  for (const column of [
    "correlation_id",
    "user_agent",
    "ip_address",
    "action_result",
    "approval_status",
    "approval_id",
    "approval_required",
    "new_values",
    "previous_values",
    "resource_id",
    "resource_type",
  ]) {
    await queryInterface.removeColumn("agent_activity_logs", column);
  }

  await queryInterface.changeColumn("agent_activity_logs", "agent_user_id", {
    type: DataTypes.UUID,
    allowNull: false,
  });
  await queryInterface.changeColumn("agent_activity_logs", "farmer_user_id", {
    type: DataTypes.UUID,
    allowNull: false,
  });

  await queryInterface.removeColumn(
    "cooperative_profiles",
    "date_of_registration",
  );
  await queryInterface.removeColumn("cooperative_profiles", "contact_person_name");

  // Enum values added to existing PostgreSQL enums are intentionally retained:
  // PostgreSQL cannot safely remove enum values without rewriting dependent
  // data. Keeping them is non-destructive and forward-compatible.
  for (const type of [
    "enum_order_fee_disclosures_fee_type",
    "enum_farmer_complaints_priority",
    "enum_farmer_complaints_status",
    "enum_farmer_complaints_category",
    "enum_farmer_action_approvals_approval_method",
    "enum_farmer_action_approvals_approval_status",
    "enum_farmer_consent_records_method",
    "enum_farmer_agent_relationships_consent_method",
    "enum_farmer_agent_relationships_status",
    "enum_agent_verification_records_status",
    "enum_agent_profiles_verification_status",
    "enum_agent_profiles_status",
  ]) {
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "${type}"`,
    );
  }
}
