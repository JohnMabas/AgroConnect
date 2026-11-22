import "./database/resolve-host.js";

import { createServer } from "node:http";
import type { Server } from "node:http";
import { getSafeDatabaseErrorMessage } from "./database/errors.js";

type ConnectionModule = typeof import("./database/connection.js");

let server: Server | undefined;
let connection: ConnectionModule | undefined;
let stopExpiryJob: (() => void) | undefined;
let stopOfferExpiryJob: (() => void) | undefined;
let stopReservationExpiryJob: (() => void) | undefined;
let stopNotificationWorker: (() => void) | undefined;
let stopRealtime: (() => Promise<void>) | undefined;
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
    stopExpiryJob?.();
    stopExpiryJob = undefined;

    stopOfferExpiryJob?.();
    stopOfferExpiryJob = undefined;

    stopReservationExpiryJob?.();
    stopReservationExpiryJob = undefined;

    stopNotificationWorker?.();
    stopNotificationWorker = undefined;

    if (stopRealtime !== undefined) {
      await stopRealtime();
      stopRealtime = undefined;
    }

    if (server?.listening) {
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
    const realtime = await import("./realtime/socket.js");

    await connection.testDatabaseConnection();
    console.log(`Database connection established in ${env.NODE_ENV} mode.`);

    if (env.NODE_ENV === "development") {
      const { findMissingModelColumns } = await import(
        "./database/schema-check.js"
      );
      const missingColumns = await findMissingModelColumns();
      if (missingColumns.length > 0) {
        console.warn(
          `[db:check] Development database schema warning: missing columns: ${missingColumns.join(", ")}. Run npm run db:migrate.`,
        );
      }
    }

    const buyerRequestExpiry = await import(
      "./modules/buyer-requests/buyer-requests.service.js"
    );
    buyerRequestExpiry.startBuyerRequestExpiryJob();
    stopExpiryJob = buyerRequestExpiry.stopBuyerRequestExpiryJob;

    const offerExpiry = await import(
      "./modules/offers/offers.service.js"
    );
    offerExpiry.startOfferExpiryJob();
    stopOfferExpiryJob = offerExpiry.stopOfferExpiryJob;

    const reservationExpiry = await import(
      "./modules/orders/reservations.service.js"
    );
    reservationExpiry.startReservationExpiryJob();
    stopReservationExpiryJob = reservationExpiry.stopReservationExpiryJob;

    const notifications = await import(
      "./modules/notifications/notifications.service.js"
    );
    notifications.startNotificationWorker();
    stopNotificationWorker = notifications.stopNotificationWorker;

    server = createServer(app);
    server.requestTimeout = env.REQUEST_TIMEOUT_MS + 5_000;
    server.headersTimeout = env.REQUEST_TIMEOUT_MS + 10_000;
    server.keepAliveTimeout = 5_000;
    realtime.createSocketServer(server);
    stopRealtime = realtime.stopSocketServer;

    server.listen(env.PORT, "0.0.0.0", () => {
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
