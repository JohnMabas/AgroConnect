import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSafeDatabaseErrorMessage } from "./errors.js";

type ConnectionModule = typeof import("./connection.js");

type SeederCommand = "up" | "down" | "down:all" | "status";

let connection: ConnectionModule | undefined;

function parseCommand(value: string | undefined): SeederCommand {
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
    `Unknown seeder command "${command}". Use up, down, down:all or status.`,
  );
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv[2]);
  connection = await import("./connection.js");
  const {
    getSeederStatus,
    runSeedersDown,
    runSeedersDownAll,
    runSeedersUp,
  } = await import("./seeder.js");

  if (command === "up") {
    const executed = await runSeedersUp();
    console.log(
      executed.length === 0
        ? "No pending seeders."
        : `Applied seeders: ${executed.join(", ")}`,
    );
    return;
  }

  if (command === "down") {
    const reverted = await runSeedersDown();
    console.log(
      reverted.length === 0
        ? "No seeders to revert."
        : `Reverted seeders: ${reverted.join(", ")}`,
    );
    return;
  }

  if (command === "down:all") {
    const reverted = await runSeedersDownAll();
    console.log(
      reverted.length === 0
        ? "No seeders to revert."
        : `Reverted seeders: ${reverted.join(", ")}`,
    );
    return;
  }

  const status = await getSeederStatus();
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
        "Database seeder command failed:",
        getSafeDatabaseErrorMessage(error),
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await connection?.closeDatabase().catch(() => undefined);
    });
}
