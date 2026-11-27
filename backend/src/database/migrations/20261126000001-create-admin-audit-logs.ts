import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const TABLE = "admin_audit_logs";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  const [tables = []] = (await queryInterface.sequelize.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = current_schema()
       AND table_name = '${TABLE}'`,
  )) as [{ table_name: string }[], unknown];

  if (tables.length === 0) {
    await queryInterface.createTable(TABLE, {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
      },
      admin_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
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
    });
  }

  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx"
     ON "admin_audit_logs" ("created_at")`,
  );
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_idx"
     ON "admin_audit_logs" ("action")`,
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.sequelize.query(
    `DROP TABLE IF EXISTS "${TABLE}";`,
  );
}
