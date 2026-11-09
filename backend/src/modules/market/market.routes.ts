import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import {
  approveObservationHandler,
  compareMarketPricesHandler,
  createMarketObservationHandler,
  generateMarketInsightsHandler,
  getDemandAnalyticsHandler,
  getMarketInsightHandler,
  getObservationHandler,
  getPriceTrendsHandler,
  getSupplyAnalyticsHandler,
  getTransactionAnalyticsHandler,
  listAdminObservationsHandler,
  listMarketInsightsHandler,
  listMarketPricesHandler,
  listMyObservationsHandler,
  rejectObservationHandler,
} from "./market.controller.js";

const marketReadLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many market data requests. Please try again later.",
});

const observationSubmitLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  message: "Too many market observation submissions. Please try again later.",
});

const adminMarketLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many market administration requests. Please try again later.",
});

export function createMarketRouter(): Router {
  const router = Router();
  router.use(authenticate, marketReadLimiter);

  router.get("/prices", listMarketPricesHandler);
  router.get("/prices/trends", getPriceTrendsHandler);
  router.get("/prices/compare", compareMarketPricesHandler);

  router.get("/analytics/supply", getSupplyAnalyticsHandler);
  router.get("/analytics/demand", getDemandAnalyticsHandler);
  router.get("/analytics/transactions", getTransactionAnalyticsHandler);

  router.post(
    "/observations",
    requireRoles(
      "farmer",
      "buyer",
      "cooperative",
      "cooperative_agent",
      "admin",
    ),
    observationSubmitLimiter,
    createMarketObservationHandler,
  );
  router.get("/observations/my", listMyObservationsHandler);
  router.get("/observations/:id", getObservationHandler);

  router.get("/insights", listMarketInsightsHandler);
  router.get("/insights/:id", getMarketInsightHandler);

  return router;
}

export function createAdminMarketRouter(): Router {
  const router = Router();
  router.use(
    authenticate,
    requireRoles("admin"),
    adminMarketLimiter,
  );

  router.get("/observations", listAdminObservationsHandler);
  router.post("/observations/:id/approve", approveObservationHandler);
  router.post("/observations/:id/reject", rejectObservationHandler);
  router.post("/insights/generate", generateMarketInsightsHandler);

  return router;
}
