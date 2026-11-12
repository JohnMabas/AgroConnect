import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import {
  getConfigHandler,
  listSessionsHandler,
  listSupportRequestsHandler,
  listWebhookEventsHandler,
  terminateSessionHandler,
  updateSupportRequestHandler,
} from "./telecom.admin.controller.js";

export function createTelecomAdminRouter(): Router {
  const router = Router();

  router.use(authenticate, requireRoles("admin"));

  router.get("/sessions", listSessionsHandler);
  router.post("/sessions/:channel/:id/terminate", terminateSessionHandler);
  router.get("/support-requests", listSupportRequestsHandler);
  router.patch("/support-requests/:id", updateSupportRequestHandler);
  router.get("/webhook-events", listWebhookEventsHandler);
  router.get("/config", getConfigHandler);

  return router;
}
