import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "node:path";
import { env } from "./config/env.js";
import { allowedOrigins } from "./config/cors.js";
import { checkDatabaseHealth } from "./database/connection.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createProfilesRouter } from "./modules/profiles/profiles.routes.js";
import { createFarmersRouter } from "./modules/farmers/farmers.routes.js";
import { createCooperativesRouter } from "./modules/cooperatives/cooperatives.routes.js";
import { createAgentsRouter } from "./modules/agents/agents.routes.js";
import { createProduceRouter } from "./modules/produce/produce.routes.js";
import { createListingsRouter } from "./modules/listings/listings.routes.js";
import { createBuyerRequestsRouter } from "./modules/buyer-requests/buyer-requests.routes.js";
import { createMarketplaceRouter } from "./modules/marketplace/marketplace.routes.js";
import { createConversationsRouter } from "./modules/messaging/conversations.routes.js";
import { createMessagesRouter } from "./modules/messaging/messages.routes.js";
import { createOffersRouter } from "./modules/offers/offers.routes.js";
import { createOrdersRouter } from "./modules/orders/orders.routes.js";
import { createReservationsRouter } from "./modules/orders/reservations.routes.js";
import { createTransportersRouter } from "./modules/transporters/transporters.routes.js";
import { createDeliveriesRouter } from "./modules/deliveries/deliveries.routes.js";
import {
  createAdminNotificationsRouter,
  createNotificationsRouter,
} from "./modules/notifications/notifications.routes.js";
import { initializeNotificationEvents } from "./modules/notifications/notifications.events.js";
import {
  createPaymentsRouter,
  createPaystackWebhookRouter,
} from "./modules/payments/payments.routes.js";
import {
  createApiRouter,
  type ApiRouterDependencies,
} from "./routes/index.js";

export interface AppDependencies {
  checkDatabaseHealth: ApiRouterDependencies["checkDatabaseHealth"];
}

export function createApp(
  dependencies: Partial<AppDependencies> = {},
) {
  initializeNotificationEvents();

  const app = express();

  app.disable("x-powered-by");

  // CORS — allow the configured frontend origin to send credentials.
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, Postman)
        // and configured frontend origins.
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} is not allowed.`));
        }
      },
      credentials: true, // required for HttpOnly cookie exchange
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Paystack signs the exact raw request bytes. Mount the webhook before the
  // global JSON parser so the signature verifier receives the untouched body.
  app.use(
    "/api/payments/paystack",
    createPaystackWebhookRouter(),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // Local development image storage. Production should use the object-storage
  // adapter instead; Render's filesystem is ephemeral.
  app.use(
    env.UPLOAD_PUBLIC_PREFIX,
    express.static(path.resolve(env.UPLOAD_STORAGE_PATH), {
      index: false,
      dotfiles: "deny",
      fallthrough: true,
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    }),
  );

  // Auth routes
  app.use("/api/auth", createAuthRouter());

  // Phase 4 feature routes
  app.use("/api/profiles", createProfilesRouter());
  app.use("/api/farmers", createFarmersRouter());
  app.use("/api/cooperatives", createCooperativesRouter());
  app.use("/api/agents", createAgentsRouter());

  // Phase 5 feature routes
  app.use("/api/produce", createProduceRouter());
  app.use("/api/listings", createListingsRouter());

  // Phase 6 feature routes
  app.use("/api/buyer-requests", createBuyerRequestsRouter());
  app.use("/api/marketplace", createMarketplaceRouter());

  // Phase 7 feature routes
  app.use("/api/conversations", createConversationsRouter());
  app.use("/api/messages", createMessagesRouter());

  // Phase 8 feature routes
  app.use("/api/offers", createOffersRouter());

  // Phase 9 feature routes
  app.use("/api/orders", createOrdersRouter());
  app.use("/api/reservations", createReservationsRouter());
  app.use("/api/payments", createPaymentsRouter());

  // Phase 10 feature routes
  app.use("/api/transporters", createTransportersRouter());
  app.use("/api/deliveries", createDeliveriesRouter());

  // Phase 11 feature routes
  app.use("/api/notifications", createNotificationsRouter());
  app.use("/api/admin/notifications", createAdminNotificationsRouter());

  // Health and other API routes
  app.use(
    "/api",
    createApiRouter({
      checkDatabaseHealth:
        dependencies.checkDatabaseHealth ?? checkDatabaseHealth,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
