import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import {
  acceptDeliveryHandler,
  assignTransporterHandler,
  createDeliveryHandler,
  declineDeliveryHandler,
  getDeliveryHandler,
  getDeliveryHistoryHandler,
  listDeliveriesHandler,
  reassignTransporterHandler,
  updateDeliveryStatusHandler,
} from "./deliveries.controller.js";

const deliveryCreateLimiter = createFixedWindowLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 120,
  message: "Too many delivery requests. Please try again later.",
});

const deliveryActionLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  message: "Too many delivery updates. Please slow down and try again shortly.",
});

export function createDeliveriesRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.post("/", deliveryCreateLimiter, createDeliveryHandler);
  router.get("/", listDeliveriesHandler);

  router.get("/:id/history", getDeliveryHistoryHandler);
  router.get("/:id", getDeliveryHandler);

  router.patch(
    "/:id/assign",
    requireRoles("admin"),
    deliveryActionLimiter,
    assignTransporterHandler,
  );
  router.patch(
    "/:id/reassign",
    requireRoles("admin"),
    deliveryActionLimiter,
    reassignTransporterHandler,
  );
  router.patch("/:id/accept", deliveryActionLimiter, acceptDeliveryHandler);
  router.patch("/:id/decline", deliveryActionLimiter, declineDeliveryHandler);
  router.patch(
    "/:id/status",
    deliveryActionLimiter,
    updateDeliveryStatusHandler,
  );

  return router;
}
