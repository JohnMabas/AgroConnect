import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.addColumn("notification_preferences", "reviews_enabled", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
  await queryInterface.addColumn(
    "notification_preferences",
    "verifications_enabled",
    {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.removeColumn(
    "notification_preferences",
    "verifications_enabled",
  );
  await queryInterface.removeColumn(
    "notification_preferences",
    "reviews_enabled",
  );
}
