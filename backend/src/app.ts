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
  createAdminReviewReportsRouter,
  createAdminReviewsRouter,
  createReviewsRouter,
  createUsersRouter,
} from "./modules/reviews/reviews.routes.js";
import {
  createAdminVerificationsRouter,
  createVerificationsRouter,
} from "./modules/verifications/verifications.routes.js";
import {
  createAdminMarketRouter,
  createMarketRouter,
} from "./modules/market/market.routes.js";
import { createAdminAIRouter, createAIRouter } from "./modules/ai/ai.routes.js";
import { createAdminFarmerProtectionRouter } from "./modules/farmer-protection/farmer-protection.routes.js";
import { createUssdRouter } from "./modules/telecom/ussd.routes.js";
import { createVoiceRouter } from "./modules/telecom/voice.routes.js";
import { createTelecomAdminRouter } from "./modules/telecom/telecom.admin.routes.js";
import { createLocalizationRouter } from "./modules/localization/localization.routes.js";
import {
  createAdminPilotRouter,
  createPilotRouter,
} from "./modules/pilot/pilot.routes.js";
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

  // Baseline security headers without adding a heavyweight middleware dependency.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

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

  // Phase 12 feature routes
  app.use("/api/reviews", createReviewsRouter());
  app.use("/api/users", createUsersRouter());
  app.use("/api/verifications", createVerificationsRouter());
  app.use("/api/admin/reviews", createAdminReviewsRouter());
  app.use("/api/admin/review-reports", createAdminReviewReportsRouter());
  app.use("/api/admin/verifications", createAdminVerificationsRouter());

  // Phase 13 feature routes
  app.use("/api/market", createMarketRouter());
  app.use("/api/admin/market", createAdminMarketRouter());

  // Phase 14: information-only AI services. Business-changing operations stay
  // on their established, separately authorised routes.
  app.use("/api/ai", createAIRouter());
  app.use("/api/admin/ai", createAdminAIRouter());

  // Phase 16: farmer protection, cooperative-only agent governance, consent,
  // approval workflows, complaints and append-only audit review.
  app.use(
    "/api/admin/farmer-protection",
    createAdminFarmerProtectionRouter(),
  );

  // Phase 17: USSD, Voice/IVR, localization and telecom administration.
  app.use("/api/ussd", createUssdRouter());
  app.use("/api/voice", createVoiceRouter());
  app.use("/api/localization", createLocalizationRouter());
  app.use("/api/admin/telecom", createTelecomAdminRouter());

  // Phase 18: controlled pilot readiness, participants, feedback and metrics.
  app.use("/api/pilot", createPilotRouter());
  app.use("/api/admin/pilot", createAdminPilotRouter());

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
