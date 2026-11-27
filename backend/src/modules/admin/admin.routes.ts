import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import {
  getOrderHandler,
  getOverviewHandler,
  getUserHandler,
  listAuditLogsHandler,
  listListingsHandler,
  listOrdersHandler,
  listPaymentsHandler,
  listTransportersHandler,
  listUsersHandler,
  moderateListingHandler,
  rejectTransporterHandler,
  updateUserStatusHandler,
} from "./admin.controller.js";

export function createAdminRouter(): Router {
  const router = Router();

  router.use(authenticate, requireRoles("admin"));

  router.get("/overview", getOverviewHandler);

  router.get("/users", listUsersHandler);
  router.get("/users/:userId", getUserHandler);
  router.patch("/users/:userId/status", updateUserStatusHandler);

  router.get("/transporters", listTransportersHandler);
  router.patch("/transporters/:id/reject", rejectTransporterHandler);

  router.get("/listings", listListingsHandler);
  router.patch("/listings/:id/moderate", moderateListingHandler);

  router.get("/orders", listOrdersHandler);
  router.get("/orders/:orderId", getOrderHandler);

  router.get("/payments", listPaymentsHandler);

  router.get("/audit-logs", listAuditLogsHandler);

  return router;
}
