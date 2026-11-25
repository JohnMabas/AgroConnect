import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  const [tables = []] = (await queryInterface.sequelize.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = current_schema()
       AND table_name = 'delivery_location_pings'`,
  )) as [{ table_name: string }[], unknown];

  if (tables.length === 0) {
    await queryInterface.createTable("delivery_location_pings", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
      },
      delivery_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "deliveries", key: "id" },
        onDelete: "CASCADE",
      },
      reporter_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      latitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      accuracy_meters: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      recorded_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  }

  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS "delivery_location_pings_delivery_recorded_idx"
     ON "delivery_location_pings" ("delivery_id", "recorded_at")`,
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.sequelize.query(
    'DROP TABLE IF EXISTS "delivery_location_pings";',
  );
}
