import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  // Optional packaging description, for example "50 kg bag" or "large crate".
  await queryInterface.addColumn("produce_listings", "packaging_description", {
    type: DataTypes.STRING(200),
    allowNull: true,
  });

  // Category names must be unique. Slugs are already unique.
  await queryInterface.addIndex("produce_categories", ["name"], {
    name: "produce_categories_name_unique",
    unique: true,
  });

  // Produce names must be unique within their category. Slugs remain globally
  // unique, which keeps public URLs stable even if a name is reused elsewhere.
  await queryInterface.addIndex("produce_types", ["category_id", "name"], {
    name: "produce_types_category_name_unique",
    unique: true,
  });

  // Supports efficient expiry sweeps and catalogue availability filters.
  await queryInterface.addIndex(
    "produce_listings",
    ["status", "expiry_date"],
    { name: "produce_listings_status_expiry_idx" },
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.removeIndex(
    "produce_listings",
    "produce_listings_status_expiry_idx",
  );
  await queryInterface.removeIndex(
    "produce_types",
    "produce_types_category_name_unique",
  );
  await queryInterface.removeIndex(
    "produce_categories",
    "produce_categories_name_unique",
  );
  await queryInterface.removeColumn("produce_listings", "packaging_description");
}
