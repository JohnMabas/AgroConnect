import type { QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const locationColumns = [
  '"pickup_latitude" DOUBLE PRECISION',
  '"pickup_longitude" DOUBLE PRECISION',
  '"delivery_latitude" DOUBLE PRECISION',
  '"delivery_longitude" DOUBLE PRECISION',
  '"current_latitude" DOUBLE PRECISION',
  '"current_longitude" DOUBLE PRECISION',
  '"current_location_accuracy_meters" DECIMAL(10,2)',
  '"current_location_recorded_at" TIMESTAMPTZ',
] as const;

const reverseLocationColumns = [
  "current_location_recorded_at",
  "current_location_accuracy_meters",
  "current_longitude",
  "current_latitude",
  "delivery_longitude",
  "delivery_latitude",
  "pickup_longitude",
  "pickup_latitude",
] as const;

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  for (const column of locationColumns) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS ${column};`,
    );
  }
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  for (const column of reverseLocationColumns) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "deliveries" DROP COLUMN IF EXISTS "${column}";`,
    );
  }
}
