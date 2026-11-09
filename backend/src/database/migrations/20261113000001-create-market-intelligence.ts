import { DataTypes, type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const MARKETS = "market_observations";
const PRICES = "market_prices";
const INSIGHTS = "market_insights";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.createTable(MARKETS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    submitted_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    cooperative_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "cooperative_profiles", key: "id" },
      onDelete: "SET NULL",
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_types", key: "id" },
      onDelete: "SET NULL",
    },
    produce_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_categories", key: "id" },
      onDelete: "SET NULL",
    },
    market_name: { type: DataTypes.STRING(200), allowNull: true },
    price_per_unit: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    unit: { type: DataTypes.STRING(50), allowNull: false },
    grade: { type: DataTypes.STRING(100), allowNull: true },
    variety: { type: DataTypes.STRING(150), allowNull: true },
    quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
    state_or_region: { type: DataTypes.STRING(150), allowNull: true },
    local_government_area: { type: DataTypes.STRING(150), allowNull: true },
    community: { type: DataTypes.STRING(150), allowNull: true },
    observed_at: { type: DataTypes.DATEONLY, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
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

  await queryInterface.addConstraint(MARKETS, {
    fields: ["produce_type_id", "produce_category_id"],
    type: "check",
    name: "market_observations_produce_reference",
    where: queryInterface.sequelize.literal(
      "produce_type_id IS NOT NULL OR produce_category_id IS NOT NULL",
    ),
  });
  await queryInterface.addConstraint(MARKETS, {
    fields: ["price_per_unit"],
    type: "check",
    name: "market_observations_price_positive",
    where: queryInterface.sequelize.literal("price_per_unit > 0"),
  });
  await queryInterface.addConstraint(MARKETS, {
    fields: ["quantity"],
    type: "check",
    name: "market_observations_quantity_positive",
    where: queryInterface.sequelize.literal(
      "quantity IS NULL OR quantity > 0",
    ),
  });
  await queryInterface.addConstraint(MARKETS, {
    fields: ["status", "rejection_reason"],
    type: "check",
    name: "market_observations_rejected_reason",
    where: queryInterface.sequelize.literal(
      "status <> 'rejected' OR rejection_reason IS NOT NULL",
    ),
  });
  await queryInterface.addIndex(MARKETS, ["dedupe_key"], {
    name: "market_observations_dedupe_unique",
    unique: true,
  });
  await queryInterface.addIndex(
    MARKETS,
    ["status", "observed_at", "produce_type_id"],
    { name: "market_observations_status_date_type_idx" },
  );
  await queryInterface.addIndex(
    MARKETS,
    ["submitted_by_user_id", "created_at"],
    { name: "market_observations_submitter_created_idx" },
  );
  await queryInterface.addIndex(
    MARKETS,
    ["cooperative_id", "status", "created_at"],
    { name: "market_observations_coop_status_created_idx" },
  );
  await queryInterface.addIndex(
    MARKETS,
    ["state_or_region", "local_government_area", "observed_at"],
    { name: "market_observations_location_date_idx" },
  );
  await queryInterface.addIndex(
    MARKETS,
    ["produce_category_id", "observed_at"],
    { name: "market_observations_category_date_idx" },
  );

  await queryInterface.createTable(PRICES, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_types", key: "id" },
      onDelete: "SET NULL",
    },
    produce_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_categories", key: "id" },
      onDelete: "SET NULL",
    },
    source_type: {
      type: DataTypes.ENUM(
        "marketplace_listing",
        "completed_transaction",
        "verified_market_observation",
        "approved_external_source",
      ),
      allowNull: false,
    },
    source_reference_id: { type: DataTypes.UUID, allowNull: true },
    market_observation_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: MARKETS, key: "id" },
      onDelete: "SET NULL",
    },
    source_name: { type: DataTypes.STRING(200), allowNull: true },
    price_per_unit: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "NGN",
    },
    unit: { type: DataTypes.STRING(50), allowNull: false },
    grade: { type: DataTypes.STRING(100), allowNull: true },
    variety: { type: DataTypes.STRING(150), allowNull: true },
    quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
    state_or_region: { type: DataTypes.STRING(150), allowNull: true },
    local_government_area: { type: DataTypes.STRING(150), allowNull: true },
    community: { type: DataTypes.STRING(150), allowNull: true },
    observed_at: { type: DataTypes.DATEONLY, allowNull: false },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
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

  await queryInterface.addConstraint(PRICES, {
    fields: ["produce_type_id", "produce_category_id"],
    type: "check",
    name: "market_prices_produce_reference",
    where: queryInterface.sequelize.literal(
      "produce_type_id IS NOT NULL OR produce_category_id IS NOT NULL",
    ),
  });
  await queryInterface.addConstraint(PRICES, {
    fields: ["price_per_unit"],
    type: "check",
    name: "market_prices_price_positive",
    where: queryInterface.sequelize.literal("price_per_unit > 0"),
  });
  await queryInterface.addConstraint(PRICES, {
    fields: ["quantity"],
    type: "check",
    name: "market_prices_quantity_positive",
    where: queryInterface.sequelize.literal("quantity IS NULL OR quantity > 0"),
  });
  await queryInterface.addIndex(PRICES, ["dedupe_key"], {
    name: "market_prices_dedupe_unique",
    unique: true,
  });
  await queryInterface.sequelize.query(
    'CREATE UNIQUE INDEX "market_prices_observation_unique" ON "market_prices" ("market_observation_id") WHERE "market_observation_id" IS NOT NULL',
  );
  await queryInterface.addIndex(
    PRICES,
    ["source_type", "is_verified", "observed_at"],
    { name: "market_prices_source_verified_date_idx" },
  );
  await queryInterface.addIndex(
    PRICES,
    ["produce_type_id", "currency", "unit", "observed_at"],
    { name: "market_prices_type_currency_unit_date_idx" },
  );
  await queryInterface.addIndex(
    PRICES,
    ["state_or_region", "local_government_area", "observed_at"],
    { name: "market_prices_location_date_idx" },
  );
  await queryInterface.addIndex(
    PRICES,
    ["produce_category_id", "observed_at"],
    { name: "market_prices_category_date_idx" },
  );

  await queryInterface.createTable(INSIGHTS, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: queryInterface.sequelize.literal("gen_random_uuid()"),
    },
    insight_type: {
      type: DataTypes.ENUM(
        "price_increase",
        "price_decrease",
        "price_volatility",
        "supply_shortage",
        "supply_surplus",
        "demand_increase",
        "demand_decrease",
      ),
      allowNull: false,
    },
    produce_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_types", key: "id" },
      onDelete: "SET NULL",
    },
    produce_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "produce_categories", key: "id" },
      onDelete: "SET NULL",
    },
    country: { type: DataTypes.STRING(100), allowNull: true },
    state_or_region: { type: DataTypes.STRING(150), allowNull: true },
    local_government_area: { type: DataTypes.STRING(150), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: true },
    unit: { type: DataTypes.STRING(50), allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: false },
    severity: {
      type: DataTypes.ENUM("low", "medium", "high"),
      allowNull: false,
      defaultValue: "low",
    },
    metric_value: { type: DataTypes.DECIMAL(18, 3), allowNull: true },
    comparison_value: { type: DataTypes.DECIMAL(18, 3), allowNull: true },
    change_percentage: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    observation_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    period_start: { type: DataTypes.DATEONLY, allowNull: false },
    period_end: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM("active", "expired", "dismissed"),
      allowNull: false,
      defaultValue: "active",
    },
    generated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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

  await queryInterface.addConstraint(INSIGHTS, {
    fields: ["produce_type_id", "produce_category_id"],
    type: "check",
    name: "market_insights_produce_reference",
    where: queryInterface.sequelize.literal(
      "produce_type_id IS NOT NULL OR produce_category_id IS NOT NULL",
    ),
  });
  await queryInterface.addIndex(INSIGHTS, ["dedupe_key"], {
    name: "market_insights_dedupe_unique",
    unique: true,
  });
  await queryInterface.addIndex(
    INSIGHTS,
    ["status", "severity", "generated_at"],
    { name: "market_insights_status_severity_generated_idx" },
  );
  await queryInterface.addIndex(
    INSIGHTS,
    ["produce_type_id", "state_or_region", "generated_at"],
    { name: "market_insights_type_region_generated_idx" },
  );
  await queryInterface.addIndex(
    INSIGHTS,
    ["produce_category_id", "generated_at"],
    { name: "market_insights_category_generated_idx" },
  );
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.dropTable(INSIGHTS);
  await queryInterface.dropTable(PRICES);
  await queryInterface.dropTable(MARKETS);
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_market_insights_status"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_market_insights_severity"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_market_insights_insight_type"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_market_prices_source_type"',
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_market_observations_status"',
  );
}
