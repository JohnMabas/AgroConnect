import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSafeDatabaseErrorMessage } from "./errors.js";

type ConnectionModule = typeof import("./connection.js");

type MigrationCommand = "up" | "down" | "down:all" | "status";

let connection: ConnectionModule | undefined;

function parseCommand(value: string | undefined): MigrationCommand {
  const command = value ?? "up";

  if (
    command === "up" ||
    command === "down" ||
    command === "down:all" ||
    command === "status"
  ) {
    return command;
  }

  throw new Error(
    `Unknown migration command "${command}". Use up, down, down:all or status.`,
  );
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv[2]);
  connection = await import("./connection.js");
  const {
    getMigrationStatus,
    runMigrationsDown,
    runMigrationsDownAll,
    runMigrationsUp,
  } = await import("./migrator.js");

  if (command === "up") {
    const executed = await runMigrationsUp();
    console.log(
      executed.length === 0
        ? "No pending migrations."
        : `Applied migrations: ${executed.join(", ")}`,
    );
    return;
  }

  if (command === "down") {
    const reverted = await runMigrationsDown();
    console.log(
      reverted.length === 0
        ? "No migrations to revert."
        : `Reverted migrations: ${reverted.join(", ")}`,
    );
    return;
  }

  if (command === "down:all") {
    const reverted = await runMigrationsDownAll();
    console.log(
      reverted.length === 0
        ? "No migrations to revert."
        : `Reverted migrations: ${reverted.join(", ")}`,
    );
    return;
  }

  const status = await getMigrationStatus();
  console.log(JSON.stringify(status, null, 2));
}

const entryPoint = process.argv[1];

if (
  entryPoint !== undefined &&
  fileURLToPath(import.meta.url) === resolve(entryPoint)
) {
  main()
    .catch((error: unknown) => {
      console.error(
        "Database migration command failed:",
        getSafeDatabaseErrorMessage(error),
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await connection?.closeDatabase().catch(() => undefined);
    });
}
