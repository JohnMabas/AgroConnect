import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const CONFIGURATIONS = "ai_configurations";
const KNOWLEDGE = "agricultural_knowledge";
const CONVERSATIONS = "ai_conversations";
const MESSAGES = "ai_conversation_messages";
const RECOMMENDATIONS = "recommendations";
const ASSESSMENTS = "integrity_assessments";
const REVIEW_HISTORY = "integrity_review_history";
const USAGE_LOGS = "ai_usage_logs";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable(CONFIGURATIONS, {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      allowNull: false,
      defaultValue: "global",
    },
    assistant_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    recommendations_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    integrity_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    updated_by_user_id: {
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

  await queryInterface.createTable(KNOWLEDGE, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    title: { type: DataTypes.STRING(250), allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    topic: { type: DataTypes.STRING(100), allowNull: false },
    crop: { type: DataTypes.STRING(120), allowNull: true },
    region: { type: DataTypes.STRING(150), allowNull: true },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    source_name: { type: DataTypes.STRING(250), allowNull: true },
    source_url: { type: DataTypes.STRING(700), allowNull: true },
    publication_date: { type: DataTypes.DATEONLY, allowNull: true },
    review_date: { type: DataTypes.DATEONLY, allowNull: true },
    approval_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "archived"),
      allowNull: false,
      defaultValue: "pending",
    },
    safety_flags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    approved_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
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

  await queryInterface.addConstraint(KNOWLEDGE, {
    fields: ["approval_status", "rejection_reason"],
    type: "check",
    name: "agricultural_knowledge_rejected_reason",
    where: queryInterface.sequelize.literal(
      "approval_status <> 'rejected' OR rejection_reason IS NOT NULL",
    ),
  });
  await queryInterface.addIndex(KNOWLEDGE, ["approval_status", "topic"], {
    name: "agricultural_knowledge_status_topic_idx",
  });
  await queryInterface.addIndex(KNOWLEDGE, ["approval_status", "crop"], {
    name: "agricultural_knowledge_status_crop_idx",
  });
  await queryInterface.addIndex(KNOWLEDGE, ["approval_status", "region"], {
    name: "agricultural_knowledge_status_region_idx",
  });
  await queryInterface.addIndex(KNOWLEDGE, ["created_at"], {
    name: "agricultural_knowledge_created_idx",
  });

  await queryInterface.createTable(CONVERSATIONS, {
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
    title: { type: DataTypes.STRING(200), allowNull: false },
    category: {
      type: DataTypes.ENUM(
        "agroconnect_support",
        "agriculture",
        "market_intelligence",
        "general",
      ),
      allowNull: false,
      defaultValue: "general",
    },
    status: {
      type: DataTypes.ENUM("active", "archived"),
      allowNull: false,
      defaultValue: "active",
    },
    last_message_at: { type: DataTypes.DATE, allowNull: true },
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

  await queryInterface.addIndex(CONVERSATIONS, ["user_id", "created_at"], {
    name: "ai_conversations_user_created_idx",
  });
  await queryInterface.addIndex(CONVERSATIONS, ["user_id", "status"], {
    name: "ai_conversations_user_status_idx",
  });

  await queryInterface.createTable(MESSAGES, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: CONVERSATIONS, key: "id" },
      onDelete: "CASCADE",
    },
    sender: {
      type: DataTypes.ENUM("user", "assistant", "system"),
      allowNull: false,
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    safety_flags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    knowledge_references: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    provider: { type: DataTypes.STRING(60), allowNull: true },
    model: { type: DataTypes.STRING(120), allowNull: true },
    request_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    response_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    latency_ms: { type: DataTypes.INTEGER, allowNull: true },
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

  await queryInterface.addConstraint(MESSAGES, {
    fields: ["request_tokens", "response_tokens"],
    type: "check",
    name: "ai_conversation_messages_tokens_nonnegative",
    where: queryInterface.sequelize.literal(
      "request_tokens >= 0 AND response_tokens >= 0",
    ),
  });
  await queryInterface.addIndex(MESSAGES, ["conversation_id", "created_at"], {
    name: "ai_conversation_messages_conversation_created_idx",
  });

  await queryInterface.createTable(RECOMMENDATIONS, {
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
    recommendation_type: {
      type: DataTypes.ENUM(
        "listing",
        "buyer_request",
        "market_opportunity",
        "price_alert",
        "platform_action",
      ),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    related_entity_type: { type: DataTypes.STRING(60), allowNull: true },
    related_entity_id: { type: DataTypes.UUID, allowNull: true },
    score: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "dismissed", "completed", "expired"),
      allowNull: false,
      defaultValue: "active",
    },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    dedupe_key: { type: DataTypes.STRING(255), allowNull: false },
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

  await queryInterface.addConstraint(RECOMMENDATIONS, {
    fields: ["score"],
    type: "check",
    name: "recommendations_score_nonnegative",
    where: queryInterface.sequelize.literal("score >= 0"),
  });
  await queryInterface.addIndex(RECOMMENDATIONS, ["user_id", "dedupe_key"], {
    name: "recommendations_user_dedupe_unique",
    unique: true,
  });
  await queryInterface.addIndex(
    RECOMMENDATIONS,
    ["user_id", "status", "expires_at"],
    { name: "recommendations_user_status_expiry_idx" },
  );
  await queryInterface.addIndex(
    RECOMMENDATIONS,
    ["recommendation_type", "status", "created_at"],
    { name: "recommendations_type_status_created_idx" },
  );

  await queryInterface.createTable(ASSESSMENTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    subject_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    related_entity_type: { type: DataTypes.STRING(60), allowNull: true },
    related_entity_id: { type: DataTypes.UUID, allowNull: true },
    risk_category: {
      type: DataTypes.ENUM(
        "price_anomaly",
        "duplicate_listing",
        "review_manipulation",
        "payment_abuse",
        "spam_activity",
        "verification_anomaly",
        "other",
      ),
      allowNull: false,
    },
    risk_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    risk_level: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
      defaultValue: "low",
    },
    detection_method: {
      type: DataTypes.ENUM("rule_based", "ai_assisted", "hybrid"),
      allowNull: false,
      defaultValue: "rule_based",
    },
    reasons: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    evidence: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("'[]'::jsonb"),
    },
    review_status: {
      type: DataTypes.ENUM(
        "pending",
        "under_review",
        "resolved",
        "false_positive",
        "escalated",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    assigned_admin_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    reviewed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    resolution_note: { type: DataTypes.TEXT, allowNull: true },
    false_positive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    dedupe_key: { type: DataTypes.STRING(255), allowNull: false },
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

  await queryInterface.addConstraint(ASSESSMENTS, {
    fields: ["risk_score"],
    type: "check",
    name: "integrity_assessments_score_range",
    where: queryInterface.sequelize.literal(
      "risk_score >= 0 AND risk_score <= 100",
    ),
  });
  await queryInterface.addIndex(ASSESSMENTS, ["dedupe_key"], {
    name: "integrity_assessments_dedupe_unique",
    unique: true,
  });
  await queryInterface.addIndex(
    ASSESSMENTS,
    ["subject_user_id", "created_at"],
    { name: "integrity_assessments_subject_created_idx" },
  );
  await queryInterface.addIndex(
    ASSESSMENTS,
    ["review_status", "risk_level", "created_at"],
    { name: "integrity_assessments_status_level_created_idx" },
  );
  await queryInterface.addIndex(
    ASSESSMENTS,
    ["assigned_admin_user_id", "review_status"],
    { name: "integrity_assessments_assignee_status_idx" },
  );

  await queryInterface.createTable(REVIEW_HISTORY, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    assessment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: ASSESSMENTS, key: "id" },
      onDelete: "CASCADE",
    },
    admin_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    action: {
      type: DataTypes.ENUM(
        "review_started",
        "resolved",
        "false_positive",
        "escalated",
        "note_added",
      ),
      allowNull: false,
    },
    from_status: { type: DataTypes.STRING(40), allowNull: true },
    to_status: { type: DataTypes.STRING(40), allowNull: false },
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
    REVIEW_HISTORY,
    ["assessment_id", "created_at"],
    { name: "integrity_review_history_assessment_created_idx" },
  );

  await queryInterface.createTable(USAGE_LOGS, {
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
    feature: {
      type: DataTypes.ENUM(
        "assistant",
        "recommendations",
        "integrity",
        "knowledge",
      ),
      allowNull: false,
    },
    provider: { type: DataTypes.STRING(60), allowNull: true },
    model: { type: DataTypes.STRING(120), allowNull: true },
    status: {
      type: DataTypes.ENUM("success", "error", "fallback", "blocked"),
      allowNull: false,
    },
    request_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    response_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    latency_ms: { type: DataTypes.INTEGER, allowNull: true },
    error_code: { type: DataTypes.STRING(100), allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
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

  await queryInterface.addConstraint(USAGE_LOGS, {
    fields: ["request_tokens", "response_tokens", "total_tokens"],
    type: "check",
    name: "ai_usage_logs_tokens_nonnegative",
    where: queryInterface.sequelize.literal(
      "request_tokens >= 0 AND response_tokens >= 0 AND total_tokens >= 0",
    ),
  });
  await queryInterface.addIndex(USAGE_LOGS, ["user_id", "feature", "created_at"], {
    name: "ai_usage_logs_user_feature_created_idx",
  });
  await queryInterface.addIndex(USAGE_LOGS, ["feature", "status", "created_at"], {
    name: "ai_usage_logs_feature_status_created_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable(USAGE_LOGS);
  await queryInterface.dropTable(REVIEW_HISTORY);
  await queryInterface.dropTable(ASSESSMENTS);
  await queryInterface.dropTable(RECOMMENDATIONS);
  await queryInterface.dropTable(MESSAGES);
  await queryInterface.dropTable(CONVERSATIONS);
  await queryInterface.dropTable(KNOWLEDGE);
  await queryInterface.dropTable(CONFIGURATIONS);

  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_ai_usage_logs_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_ai_usage_logs_feature"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_integrity_review_history_action"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_integrity_assessments_review_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_integrity_assessments_detection_method"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_integrity_assessments_risk_level"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_integrity_assessments_risk_category"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_recommendations_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_recommendations_recommendation_type"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_ai_conversation_messages_sender"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_ai_conversations_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_ai_conversations_category"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_agricultural_knowledge_approval_status"',
  );
}
