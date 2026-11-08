// Resolve the database hostname to an IPv4 address before any database module
// is imported. This machine's DNS synthesises a NAT64 AAAA record alongside
// the real A record. Node's Happy Eyeballs races both in parallel; the IPv6
// attempt fails immediately (ENETUNREACH) and the AggregateError surfaces as
// ETIMEDOUT in the Sequelize pool. Pre-resolving to IPv4 avoids the race.
import { resolve4 } from "node:dns/promises";

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
    // Load .env first (dotenv is idempotent) so we can read the hostname before
    // env.ts caches it. Then resolve the hostname to an IPv4 address to prevent
    // Node's Happy Eyeballs from racing IPv4 against an unreachable DNS64
    // synthetic AAAA record, which causes ETIMEDOUT in the Sequelize pool.
    const { config: loadDotenv } = await import("dotenv");
    loadDotenv({ quiet: true });

    const rawUrl = process.env.DATABASE_URL;
    const rawHost = process.env.DB_HOST;
    const hostname = rawUrl
      ? (() => {
          try {
            return new URL(rawUrl).hostname;
          } catch {
            return undefined;
          }
        })()
      : rawHost;

    if (hostname) {
      try {
        const addresses = await resolve4(hostname);
        const ipv4 = addresses[0];
        if (ipv4 !== undefined) {
          // Patch process.env so env.ts uses the resolved IP.
          // Keep the original hostname in DB_SSL_SERVERNAME so TLS SNI works.
          if (rawUrl) {
            const parsed = new URL(rawUrl);
            process.env.DB_SSL_SERVERNAME = parsed.hostname;
            parsed.hostname = ipv4;
            process.env.DATABASE_URL = parsed.toString();
          } else if (rawHost) {
            process.env.DB_SSL_SERVERNAME = rawHost;
            process.env.DB_HOST = ipv4;
          }
          console.log(`Resolved ${hostname} → ${ipv4} (IPv4)`);
        }
      } catch {
        // DNS resolution failed; proceed with the original hostname and hope
        // for the best (e.g. IPv6-capable network, or hostname is already an IP).
      }
    }

    const { env } = await import("./config/env.js");
    connection = await import("./database/connection.js");
    const { app } = await import("./app.js");
    const realtime = await import("./realtime/socket.js");

    await connection.testDatabaseConnection();
    console.log(`Database connection established in ${env.NODE_ENV} mode.`);

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
