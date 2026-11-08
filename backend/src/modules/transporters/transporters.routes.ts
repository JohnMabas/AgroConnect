import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import {
  approveTransporterHandler,
  createTransporterProfileHandler,
  getMyTransporterProfileHandler,
  getTransporterHandler,
  listAvailableTransportersHandler,
  reactivateTransporterHandler,
  suspendTransporterHandler,
  updateTransporterProfileHandler,
} from "./transporters.controller.js";
import { listMyDeliveriesHandler } from "../deliveries/deliveries.controller.js";

const profileWriteLimiter = createFixedWindowLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: "Too many transporter profile changes. Please try again later.",
});

export function createTransportersRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.post("/profile", profileWriteLimiter, createTransporterProfileHandler);
  router.get("/profile", getMyTransporterProfileHandler);
  router.patch(
    "/profile",
    profileWriteLimiter,
    updateTransporterProfileHandler,
  );

  router.get("/available", listAvailableTransportersHandler);
  router.get("/my-deliveries", listMyDeliveriesHandler);

  router.patch(
    "/:id/approve",
    requireRoles("admin"),
    approveTransporterHandler,
  );
  router.patch(
    "/:id/suspend",
    requireRoles("admin"),
    suspendTransporterHandler,
  );
  router.patch(
    "/:id/reactivate",
    requireRoles("admin"),
    reactivateTransporterHandler,
  );

  router.get("/:id", getTransporterHandler);

  return router;
}
