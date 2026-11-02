import type { Server } from "node:http";
import { getSafeDatabaseErrorMessage } from "./database/errors.js";

type ConnectionModule = typeof import("./database/connection.js");

let server: Server | undefined;
let connection: ConnectionModule | undefined;
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received. Shutting down AgroConnect API...`);

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server !== undefined) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await connection?.closeDatabase();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExit);
    console.error(
      "Error while shutting down:",
      getSafeDatabaseErrorMessage(error),
    );
    process.exit(1);
  }
}

async function start(): Promise<void> {
  try {
    const { env } = await import("./config/env.js");
    connection = await import("./database/connection.js");
    const { app } = await import("./app.js");

    await connection.testDatabaseConnection();
    console.log(`Database connection established in ${env.NODE_ENV} mode.`);

    server = app.listen(env.PORT, "0.0.0.0", () => {
      console.log(
        `AgroConnect API listening on port ${env.PORT} in ${env.NODE_ENV} mode.`,
      );
    });

    server.on("error", (error) => {
      console.error("Failed to start AgroConnect API:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error(
      "Failed to start AgroConnect API:",
      getSafeDatabaseErrorMessage(error),
    );
    await connection?.closeDatabase().catch(() => undefined);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();
