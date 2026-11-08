import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import {
  getNotificationHandler,
  getNotificationPreferencesHandler,
  listNotificationDeliveriesHandler,
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  retryNotificationDeliveryHandler,
  unreadNotificationCountHandler,
  updateNotificationPreferencesHandler,
} from "./notifications.controller.js";

const notificationReadLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many notification updates. Please slow down and try again.",
});

const notificationPreferenceLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  message: "Too many preference updates. Please try again later.",
});

const adminNotificationLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  message: "Too many notification admin requests. Please try again later.",
});

export function createNotificationsRouter(): Router {
  const router = Router();
  router.use(authenticate);

  router.get("/", listNotificationsHandler);
  router.get("/unread-count", unreadNotificationCountHandler);
  router.get("/preferences", getNotificationPreferencesHandler);
  router.patch(
    "/preferences",
    notificationPreferenceLimiter,
    updateNotificationPreferencesHandler,
  );
  router.patch(
    "/read-all",
    notificationReadLimiter,
    markAllNotificationsReadHandler,
  );
  router.patch(
    "/:id/read",
    notificationReadLimiter,
    markNotificationReadHandler,
  );
  router.get("/:id", getNotificationHandler);

  return router;
}

export function createAdminNotificationsRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRoles("admin"), adminNotificationLimiter);

  router.get("/deliveries", listNotificationDeliveriesHandler);
  router.post(
    "/deliveries/:id/retry",
    retryNotificationDeliveryHandler,
  );

  return router;
}
