import { QueryTypes } from "sequelize";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getMigrationStatus,
  runMigrationsDownAll,
  runMigrationsUp,
} from "../src/database/migrator.js";
import { sequelize } from "../src/database/sequelize.js";
import { resetTestDatabase } from "./test-database.js";

const PHASE_2_TABLES = ["roles", "user_roles", "users"];
const PHASE_3_TABLES = [
  "email_verification_tokens",
  "phone_otps",
  "refresh_tokens",
  "user_passwords",
];
const PHASE_4_TABLES = [
  "agent_activity_logs",
  "cooperative_agent_assignments",
  "cooperative_memberships",
  "cooperative_profiles",
  "farmer_profiles",
  "user_profiles",
];
const PHASE_5_TABLES = [
  "inventory_adjustments",
  "produce_categories",
  "produce_listing_images",
  "produce_listings",
  "produce_types",
];
const PHASE_6_TABLES = ["buyer_requests"];
const PHASE_7_TABLES = [
  "conversation_participants",
  "conversations",
  "messages",
];
const PHASE_8_TABLES = ["offer_events", "offers"];
const PHASE_9_TABLES = [
  "inventory_reservations",
  "order_events",
  "order_items",
  "orders",
  "payment_webhook_events",
  "payments",
  "refunds",
];
const PHASE_10_TABLES = [
  "deliveries",
  "delivery_history",
  "transporter_profiles",
];
const ALL_TABLES = [
  ...PHASE_2_TABLES,
  ...PHASE_3_TABLES,
  ...PHASE_4_TABLES,
  ...PHASE_5_TABLES,
  ...PHASE_6_TABLES,
  ...PHASE_7_TABLES,
  ...PHASE_8_TABLES,
  ...PHASE_9_TABLES,
  ...PHASE_10_TABLES,
].sort();

const ALL_MIGRATION_NAMES = [
  "20261102000001-create-roles",
  "20261102000002-create-users",
  "20261102000003-create-user-roles",
  "20261102000004-create-user-passwords",
  "20261102000005-create-phone-otps",
  "20261102000006-create-email-verification-tokens",
  "20261102000007-create-refresh-tokens",
  "20261103000001-create-user-profiles",
  "20261103000002-create-farmer-profiles",
  "20261103000003-create-cooperative-profiles",
  "20261103000004-create-cooperative-memberships",
  "20261103000005-create-cooperative-agent-assignments",
  "20261103000006-create-agent-activity-logs",
  "20261104000001-create-produce-categories",
  "20261104000002-create-produce-types",
  "20261104000003-create-produce-listings",
  "20261104000004-create-produce-listing-images",
  "20261104000005-create-inventory-adjustments",
  "20261104000006-produce-catalogue-hardening",
  "20261105000001-create-buyer-requests",
  "20261106000001-create-conversations",
  "20261106000002-create-conversation-participants",
  "20261106000003-create-messages",
  "20261107000001-create-offers",
  "20261108000001-create-orders",
  "20261108000002-create-inventory-reservations",
  "20261108000003-create-payments",
  "20261109000001-create-transporter-profiles",
  "20261109000002-create-deliveries",
  "20261109000003-create-delivery-history",
];

async function getPublicTables(): Promise<string[]> {
  const rows = await sequelize.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name NOT LIKE 'SequelizeMeta%'
     ORDER BY table_name`,
    { type: QueryTypes.SELECT },
  );
  return rows.map((row) => row.table_name);
}

describe("migrations", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  it(
    "runs all migrations successfully",
    async () => {
      const applied = await runMigrationsUp();

      expect(applied).toEqual(ALL_MIGRATION_NAMES);
      await expect(getPublicTables()).resolves.toEqual(ALL_TABLES);

      const status = await getMigrationStatus();
      expect(status.pending).toEqual([]);
      expect(status.executed).toHaveLength(ALL_MIGRATION_NAMES.length);
    },
    480_000, // allow more time for Aiven cold start and 29 sequential migrations
  );

  it(
    "rolls back all migrations and re-runs them",
    async () => {
      const reverted = await runMigrationsDownAll();

      expect(reverted).toEqual([...ALL_MIGRATION_NAMES].reverse());
      await expect(getPublicTables()).resolves.toEqual([]);

      const reapplied = await runMigrationsUp();
      expect(reapplied).toHaveLength(ALL_MIGRATION_NAMES.length);
      await expect(getPublicTables()).resolves.toEqual(ALL_TABLES);
    },
    360_000,
  );
});
