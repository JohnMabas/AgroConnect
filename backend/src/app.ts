import express from "express";
import { checkDatabaseHealth } from "./database/connection.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
