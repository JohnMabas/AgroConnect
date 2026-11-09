import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const REPORT_REASONS = [
  "abusive_language",
  "harassment",
  "spam",
  "false_misleading",
  "personal_information",
  "other",
] as const;

const REPORT_STATUSES = [
  "pending",
  "under_review",
  "resolved",
  "dismissed",
] as const;

const REVIEW_HISTORY_ACTIONS = [
  "created",
  "edited",
  "reported",
  "report_status_changed",
  "hidden",
  "restored",
] as const;

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("reviews", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    reviewer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    reviewed_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
      onDelete: "CASCADE",
    },
    delivery_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "deliveries", key: "id" },
      onDelete: "CASCADE",
    },
    rating: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    review_title: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    review_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_hidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hidden_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hidden_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    hidden_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    edited_at: {
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

  await queryInterface.addConstraint("reviews", {
    fields: ["reviewer_id", "reviewed_user_id"],
    type: "check",
    name: "reviews_distinct_participants",
    where: queryInterface.sequelize.literal(
      "reviewer_id <> reviewed_user_id",
    ),
  });
  await queryInterface.addConstraint("reviews", {
    fields: ["rating"],
    type: "check",
    name: "reviews_rating_range",
    where: queryInterface.sequelize.literal("rating BETWEEN 1 AND 5"),
  });

  await queryInterface.addIndex("reviews", ["reviewed_user_id", "is_hidden", "created_at"], {
    name: "reviews_reviewed_hidden_created_idx",
  });
  await queryInterface.addIndex("reviews", ["reviewer_id", "created_at"], {
    name: "reviews_reviewer_created_idx",
  });
  await queryInterface.addIndex("reviews", ["order_id"], {
    name: "reviews_order_idx",
  });
  await queryInterface.addIndex("reviews", ["delivery_id"], {
    name: "reviews_delivery_idx",
  });
  await queryInterface.addIndex("reviews", ["rating"], {
    name: "reviews_rating_idx",
  });
  await queryInterface.addIndex(
    "reviews",
    ["reviewer_id", "reviewed_user_id", "order_id"],
    {
      name: "reviews_order_participant_unique",
      unique: true,
      where: { delivery_id: null },
    },
  );
  await queryInterface.sequelize.query(
    'CREATE UNIQUE INDEX "reviews_delivery_participant_unique" ON "reviews" ("reviewer_id", "reviewed_user_id", "delivery_id") WHERE "delivery_id" IS NOT NULL',
  );

  await queryInterface.createTable("review_reports", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    review_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "reviews", key: "id" },
      onDelete: "CASCADE",
    },
    reporter_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    reason: {
      type: DataTypes.ENUM(...REPORT_REASONS),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...REPORT_STATUSES),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    resolution_note: {
      type: DataTypes.TEXT,
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

  await queryInterface.addIndex("review_reports", ["review_id", "created_at"], {
    name: "review_reports_review_created_idx",
  });
  await queryInterface.addIndex("review_reports", ["status", "created_at"], {
    name: "review_reports_status_created_idx",
  });
  await queryInterface.addIndex("review_reports", ["reporter_id"], {
    name: "review_reports_reporter_idx",
  });
  await queryInterface.addIndex("review_reports", ["reporter_id", "review_id"], {
    name: "review_reports_reporter_review_unique",
    unique: true,
  });

  await queryInterface.createTable("review_history", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    review_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "reviews", key: "id" },
      onDelete: "CASCADE",
    },
    report_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "review_reports", key: "id" },
      onDelete: "SET NULL",
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    action: {
      type: DataTypes.ENUM(...REVIEW_HISTORY_ACTIONS),
      allowNull: false,
    },
    previous_rating: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    new_rating: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    previous_title: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    new_title: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    previous_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    note: {
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

  await queryInterface.addIndex("review_history", ["review_id", "created_at"], {
    name: "review_history_review_created_idx",
  });
  await queryInterface.addIndex("review_history", ["actor_user_id"], {
    name: "review_history_actor_idx",
  });
  await queryInterface.addIndex("review_history", ["action"], {
    name: "review_history_action_idx",
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("review_history");
  await queryInterface.dropTable("review_reports");
  await queryInterface.dropTable("reviews");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_review_reports_reason"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_review_reports_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_review_history_action"',
  );
}
