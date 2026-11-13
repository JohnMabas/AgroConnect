import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const PILOT_CONFIGURATIONS = "pilot_configurations";
const PILOT_PARTICIPANTS = "pilot_participants";
const PILOT_FEEDBACK = "pilot_feedback";

const ENUM_TYPES = [
  "enum_pilot_configurations_status",
  "enum_pilot_participants_participant_type",
  "enum_pilot_participants_status",
  "enum_pilot_feedback_participant_type",
  "enum_pilot_feedback_category",
  "enum_pilot_feedback_severity",
  "enum_pilot_feedback_status",
];

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable(PILOT_CONFIGURATIONS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    status: {
      type: DataTypes.ENUM("draft", "active", "paused", "completed", "archived"),
      allowNull: false,
      defaultValue: "draft",
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "Nigeria",
    },
    state_or_region: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "Plateau",
    },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    locations: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    produce_category_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    readiness_overrides: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'{}'::jsonb"),
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_by_user_id: {
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

  // Only one pilot configuration can be active at a time.
  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX "pilot_configurations_single_active_idx"
     ON "${PILOT_CONFIGURATIONS}" ((is_active))
     WHERE is_active = true`,
  );

  await queryInterface.createTable(PILOT_PARTICIPANTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    pilot_configuration_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: PILOT_CONFIGURATIONS, key: "id" },
      onDelete: "CASCADE",
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
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
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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
    PILOT_PARTICIPANTS,
    ["pilot_configuration_id", "user_id"],
    {
      name: "pilot_participants_config_user_unique",
      unique: true,
    },
  );
  await queryInterface.addIndex(PILOT_PARTICIPANTS, ["user_id"], {
    name: "pilot_participants_user_idx",
  });
  await queryInterface.addIndex(PILOT_PARTICIPANTS, ["status"], {
    name: "pilot_participants_status_idx",
  });

  await queryInterface.createTable(PILOT_FEEDBACK, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    feedback_number: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    pilot_configuration_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: PILOT_CONFIGURATIONS, key: "id" },
      onDelete: "SET NULL",
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    participant_type: {
      type: DataTypes.ENUM(
        "farmer",
        "buyer",
        "cooperative",
        "cooperative_agent",
        "transporter",
        "administrator",
      ),
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        "registration",
        "listing",
        "finding_buyers",
        "communication",
        "payment",
        "delivery",
        "ussd",
        "voice",
        "agent_misconduct",
        "general",
      ),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    severity: {
      type: DataTypes.ENUM("low", "normal", "high", "critical"),
      allowNull: false,
      defaultValue: "normal",
    },
    status: {
      type: DataTypes.ENUM(
        "new",
        "acknowledged",
        "under_review",
        "in_progress",
        "resolved",
        "closed",
      ),
      allowNull: false,
      defaultValue: "new",
    },
    assigned_admin_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    resolution_notes: { type: DataTypes.TEXT, allowNull: true },
    related_complaint_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "farmer_complaints", key: "id" },
      onDelete: "SET NULL",
    },
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

  await queryInterface.addIndex(PILOT_FEEDBACK, ["user_id", "created_at"], {
    name: "pilot_feedback_user_created_idx",
  });
  await queryInterface.addIndex(PILOT_FEEDBACK, ["status", "created_at"], {
    name: "pilot_feedback_status_created_idx",
  });
  await queryInterface.addIndex(PILOT_FEEDBACK, ["category"], {
    name: "pilot_feedback_category_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable(PILOT_FEEDBACK);
  await queryInterface.dropTable(PILOT_PARTICIPANTS);
  await queryInterface.dropTable(PILOT_CONFIGURATIONS);

  for (const type of ENUM_TYPES) {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}"`);
  }
}
