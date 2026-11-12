import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const USSD_SESSIONS = "ussd_sessions";
const USSD_SESSION_EVENTS = "ussd_session_events";
const VOICE_CALL_SESSIONS = "voice_call_sessions";
const VOICE_CALL_EVENTS = "voice_call_events";
const TELECOM_WEBHOOK_EVENTS = "telecom_webhook_events";
const TELECOM_SUPPORT_REQUESTS = "telecom_support_requests";

const ENUM_TYPES = [
  "enum_ussd_sessions_status",
  "enum_ussd_session_events_response_type",
  "enum_voice_call_sessions_status",
  "enum_voice_call_events_action",
  "enum_telecom_webhook_events_channel",
  "enum_telecom_webhook_events_status",
  "enum_telecom_support_requests_channel",
  "enum_telecom_support_requests_status",
];

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable(USSD_SESSIONS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    provider_session_id: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    phone_number: { type: DataTypes.STRING(32), allowNull: false },
    network_code: { type: DataTypes.STRING(40), allowNull: true },
    service_code: { type: DataTypes.STRING(40), allowNull: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "en",
    },
    menu_key: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "main",
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "expired", "failed"),
      allowNull: false,
      defaultValue: "active",
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'{}'::jsonb"),
    },
    last_input_hash: { type: DataTypes.STRING(64), allowNull: true },
    last_input_at: { type: DataTypes.DATE, allowNull: true },
    last_response_type: { type: DataTypes.STRING(3), allowNull: true },
    last_response_text: { type: DataTypes.TEXT, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    started_at: { type: DataTypes.DATE, allowNull: false },
    last_activity_at: { type: DataTypes.DATE, allowNull: false },
    ended_at: { type: DataTypes.DATE, allowNull: true },
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

  await queryInterface.addIndex(USSD_SESSIONS, ["phone_number"], {
    name: "ussd_sessions_phone_idx",
  });
  await queryInterface.addIndex(USSD_SESSIONS, ["user_id"], {
    name: "ussd_sessions_user_idx",
  });
  await queryInterface.addIndex(USSD_SESSIONS, ["status", "expires_at"], {
    name: "ussd_sessions_status_expiry_idx",
  });

  await queryInterface.createTable(USSD_SESSION_EVENTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    ussd_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: USSD_SESSIONS, key: "id" },
      onDelete: "CASCADE",
    },
    event_key: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    menu_key: { type: DataTypes.STRING(60), allowNull: false },
    input_hash: { type: DataTypes.STRING(64), allowNull: true },
    response_type: {
      type: DataTypes.ENUM("CON", "END"),
      allowNull: false,
    },
    response_text: { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex(
    USSD_SESSION_EVENTS,
    ["ussd_session_id", "created_at"],
    { name: "ussd_session_events_session_created_idx" },
  );

  await queryInterface.createTable(VOICE_CALL_SESSIONS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    provider_session_id: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    caller_number: { type: DataTypes.STRING(32), allowNull: false },
    destination_number: { type: DataTypes.STRING(32), allowNull: true },
    direction: { type: DataTypes.STRING(20), allowNull: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "en",
    },
    menu_key: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "main",
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "expired", "failed"),
      allowNull: false,
      defaultValue: "active",
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'{}'::jsonb"),
    },
    last_input_hash: { type: DataTypes.STRING(64), allowNull: true },
    last_input_at: { type: DataTypes.DATE, allowNull: true },
    last_response_xml: { type: DataTypes.TEXT, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    started_at: { type: DataTypes.DATE, allowNull: false },
    last_activity_at: { type: DataTypes.DATE, allowNull: false },
    ended_at: { type: DataTypes.DATE, allowNull: true },
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

  await queryInterface.addIndex(VOICE_CALL_SESSIONS, ["caller_number"], {
    name: "voice_call_sessions_caller_idx",
  });
  await queryInterface.addIndex(VOICE_CALL_SESSIONS, ["user_id"], {
    name: "voice_call_sessions_user_idx",
  });
  await queryInterface.addIndex(VOICE_CALL_SESSIONS, ["status", "expires_at"], {
    name: "voice_call_sessions_status_expiry_idx",
  });

  await queryInterface.createTable(VOICE_CALL_EVENTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    voice_call_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: VOICE_CALL_SESSIONS, key: "id" },
      onDelete: "CASCADE",
    },
    event_key: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    action: {
      type: DataTypes.ENUM("say", "get_digits", "redirect", "hangup"),
      allowNull: false,
    },
    input_digits_hash: { type: DataTypes.STRING(64), allowNull: true },
    response_xml: { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex(
    VOICE_CALL_EVENTS,
    ["voice_call_session_id", "created_at"],
    { name: "voice_call_events_session_created_idx" },
  );

  await queryInterface.createTable(TELECOM_WEBHOOK_EVENTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    provider: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "africastalking",
    },
    channel: {
      type: DataTypes.ENUM("ussd", "voice"),
      allowNull: false,
    },
    event_key: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    provider_session_id: { type: DataTypes.STRING(200), allowNull: true },
    payload_hash: { type: DataTypes.STRING(64), allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "received",
        "processed",
        "duplicate",
        "rejected",
        "failed",
      ),
      allowNull: false,
      defaultValue: "received",
    },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    received_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    processed_at: { type: DataTypes.DATE, allowNull: true },
  });

  await queryInterface.addIndex(
    TELECOM_WEBHOOK_EVENTS,
    ["channel", "received_at"],
    { name: "telecom_webhook_events_channel_received_idx" },
  );
  await queryInterface.addIndex(TELECOM_WEBHOOK_EVENTS, ["status"], {
    name: "telecom_webhook_events_status_idx",
  });

  await queryInterface.createTable(TELECOM_SUPPORT_REQUESTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    phone_number: { type: DataTypes.STRING(32), allowNull: false },
    channel: {
      type: DataTypes.ENUM("ussd", "voice"),
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "en",
    },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("open", "acknowledged", "resolved", "closed"),
      allowNull: false,
      defaultValue: "open",
    },
    provider_session_id: { type: DataTypes.STRING(200), allowNull: true },
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

  await queryInterface.addIndex(TELECOM_SUPPORT_REQUESTS, ["phone_number"], {
    name: "telecom_support_requests_phone_idx",
  });
  await queryInterface.addIndex(TELECOM_SUPPORT_REQUESTS, ["status", "created_at"], {
    name: "telecom_support_requests_status_created_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable(TELECOM_SUPPORT_REQUESTS);
  await queryInterface.dropTable(TELECOM_WEBHOOK_EVENTS);
  await queryInterface.dropTable(VOICE_CALL_EVENTS);
  await queryInterface.dropTable(VOICE_CALL_SESSIONS);
  await queryInterface.dropTable(USSD_SESSION_EVENTS);
  await queryInterface.dropTable(USSD_SESSIONS);

  for (const type of ENUM_TYPES) {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}"`);
  }
}
