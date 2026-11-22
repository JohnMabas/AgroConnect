import "./resolve-host.js";

import { closeDatabase } from "./connection.js";
import { getSafeDatabaseErrorMessage } from "./errors.js";
import { findMissingModelColumns } from "./schema-check.js";

async function main(): Promise<void> {
  const missing = await findMissingModelColumns();

  if (missing.length > 0) {
    console.error(
      `Database schema check failed. Missing columns:\n${missing.map((column) => `  - ${column}`).join("\n")}\nRun npm run db:migrate.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log("Database schema check passed. All model columns exist.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Database schema check failed:",
      getSafeDatabaseErrorMessage(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch(() => undefined);
  });
