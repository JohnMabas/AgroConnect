import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { checkDatabaseHealth } from "./database/connection.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createProfilesRouter } from "./modules/profiles/profiles.routes.js";
import { createFarmersRouter } from "./modules/farmers/farmers.routes.js";
import { createCooperativesRouter } from "./modules/cooperatives/cooperatives.routes.js";
import { createAgentsRouter } from "./modules/agents/agents.routes.js";
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
  const app = express();

  app.disable("x-powered-by");

  // CORS — allow the configured frontend origin to send credentials.
  const allowedOrigins = [
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean) as string[];

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

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // Auth routes
  app.use("/api/auth", createAuthRouter());

  // Phase 4 feature routes
  app.use("/api/profiles", createProfilesRouter());
  app.use("/api/farmers", createFarmersRouter());
  app.use("/api/cooperatives", createCooperativesRouter());
  app.use("/api/agents", createAgentsRouter());

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
