import { Router } from "express";
import type { DatabaseHealth } from "../database/connection.js";

export type DatabaseHealthCheck = () => Promise<DatabaseHealth>;

export function createHealthRouter(
  checkDatabaseHealth: DatabaseHealthCheck,
): Router {
  const healthRouter = Router();

  healthRouter.get("/", async (_req, res) => {
    const database = await checkDatabaseHealth();
    const healthy = database.status === "up";

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: {
        status: healthy ? "ok" : "unavailable",
        service: "agroconnect-api",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        api: "up",
        database: {
          status: database.status,
        },
      },
      ...(healthy
        ? {}
        : {
            error: {
              message: "Database is unavailable.",
            },
          }),
    });
  });

  return healthRouter;
}
