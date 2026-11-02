import { Router } from "express";
import {
  createHealthRouter,
  type DatabaseHealthCheck,
} from "./health.routes.js";

export interface ApiRouterDependencies {
  checkDatabaseHealth: DatabaseHealthCheck;
}

export function createApiRouter({
  checkDatabaseHealth,
}: ApiRouterDependencies): Router {
  const apiRouter = Router();

  apiRouter.use("/health", createHealthRouter(checkDatabaseHealth));

  return apiRouter;
}
