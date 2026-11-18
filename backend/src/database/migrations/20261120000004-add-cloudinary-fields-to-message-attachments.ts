import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.addColumn("message_attachments", "resource_type", {
    type: DataTypes.STRING(20),
    allowNull: true,
  });
  await queryInterface.addColumn("message_attachments", "public_id", {
    type: DataTypes.STRING(512),
    allowNull: true,
  });

  // Safe defaults for legacy/local rows: infer resource type from attachment_type
  // and keep storage_key as the canonical lookup key/public identifier.
  await queryInterface.sequelize.query(`
    UPDATE message_attachments
    SET
      resource_type = COALESCE(
        resource_type,
        CASE
          WHEN attachment_type = 'image' THEN 'image'
          WHEN attachment_type = 'audio' THEN 'video'
          ELSE 'raw'
        END
      ),
      public_id = COALESCE(public_id, storage_key)
    WHERE resource_type IS NULL OR public_id IS NULL;
  `);
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.removeColumn("message_attachments", "public_id");
  await queryInterface.removeColumn("message_attachments", "resource_type");
}
