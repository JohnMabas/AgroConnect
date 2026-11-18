import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable("call_sessions", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "conversations", key: "id" },
      onDelete: "CASCADE",
    },
    caller_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    callee_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    call_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    initiated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ended_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    end_reason: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
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

  await queryInterface.addIndex("call_sessions", ["conversation_id"], {
    name: "call_sessions_conversation_idx",
  });
  await queryInterface.addIndex("call_sessions", ["caller_user_id"], {
    name: "call_sessions_caller_idx",
  });
  await queryInterface.addIndex("call_sessions", ["callee_user_id"], {
    name: "call_sessions_callee_idx",
  });
  await queryInterface.addIndex("call_sessions", ["status"], {
    name: "call_sessions_status_idx",
  });
  await queryInterface.addIndex("call_sessions", ["initiated_at"], {
    name: "call_sessions_initiated_idx",
  });

  await queryInterface.addConstraint("call_sessions", {
    fields: ["call_type"],
    type: "check",
    name: "call_sessions_type_check",
    where: queryInterface.sequelize.literal("call_type IN ('audio', 'video')"),
  });
  await queryInterface.addConstraint("call_sessions", {
    fields: ["status"],
    type: "check",
    name: "call_sessions_status_check",
    where: queryInterface.sequelize.literal(
      "status IN ('ringing','accepted','rejected','ended','missed','cancelled','failed')",
    ),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable("call_sessions");
}
