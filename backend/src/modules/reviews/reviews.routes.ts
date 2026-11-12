import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
  requireRoles,
} from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import { getTrustProfileHandler } from "../verifications/verifications.controller.js";
import {
  getMyLanguageHandler,
  updateMyLanguageHandler,
} from "../localization/localization.controller.js";
import {
  adminGetReportHandler,
  adminGetReviewHandler,
  adminHideReviewHandler,
  adminListReportsHandler,
  adminListReviewsHandler,
  adminRestoreReviewHandler,
  adminUpdateReportStatusHandler,
  createReviewHandler,
  getReviewHandler,
  getReviewSummaryHandler,
  listMyReviewsHandler,
  listUserReviewsHandler,
  reportReviewHandler,
  updateReviewHandler,
} from "./reviews.controller.js";

const reviewWriteLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  message: "Too many review requests. Please try again later.",
});

const reportLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  message: "Too many review reports. Please try again later.",
});

const adminReviewLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many review administration requests. Please try again later.",
});

export function createReviewsRouter(): Router {
  const router = Router();

  router.post("/", authenticate, reviewWriteLimiter, createReviewHandler);
  router.get("/my-reviews", authenticate, listMyReviewsHandler);
  router.post(
    "/:id/report",
    authenticate,
    reportLimiter,
    reportReviewHandler,
  );
  router.patch("/:id", authenticate, reviewWriteLimiter, updateReviewHandler);
  router.get("/:id", optionalAuthenticate, getReviewHandler);

  return router;
}

export function createUsersRouter(): Router {
  const router = Router();

  router.get("/my-language", authenticate, getMyLanguageHandler);
  router.put("/my-language", authenticate, updateMyLanguageHandler);
  router.patch("/my-language", authenticate, updateMyLanguageHandler);

  router.get(
    "/:userId/reviews",
    optionalAuthenticate,
    listUserReviewsHandler,
  );
  router.get(
    "/:userId/reviews/summary",
    optionalAuthenticate,
    getReviewSummaryHandler,
  );
  router.get(
    "/:userId/trust-profile",
    optionalAuthenticate,
    getTrustProfileHandler,
  );

  return router;
}

export function createAdminReviewsRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRoles("admin"), adminReviewLimiter);

  router.get("/", adminListReviewsHandler);
  router.get("/:id", adminGetReviewHandler);
  router.post("/:id/hide", adminHideReviewHandler);
  router.post("/:id/restore", adminRestoreReviewHandler);

  return router;
}

export function createAdminReviewReportsRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRoles("admin"), adminReviewLimiter);

  router.get("/", adminListReportsHandler);
  router.get("/:id", adminGetReportHandler);
  router.patch("/:id/status", adminUpdateReportStatusHandler);

  return router;
}
