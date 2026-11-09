import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import { uploadVerificationDocument } from "./verification-document.upload.js";
import {
  adminApproveVerificationHandler,
  adminGetVerificationHandler,
  adminListVerificationsHandler,
  adminRejectVerificationHandler,
  deleteVerificationDocumentHandler,
  downloadVerificationDocumentHandler,
  getMyVerificationStatusHandler,
  getVerificationHandler,
  submitVerificationHandler,
  uploadVerificationDocumentHandler,
} from "./verifications.controller.js";

const submitLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  message: "Too many verification requests. Please try again later.",
});

const documentLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  message: "Too many verification document requests. Please try again later.",
});

const adminVerificationLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many verification administration requests. Please try again later.",
});

export function createVerificationsRouter(): Router {
  const router = Router();
  router.use(authenticate);

  router.post("/", submitLimiter, submitVerificationHandler);
  router.get("/my-status", getMyVerificationStatusHandler);
  router.post(
    "/:id/documents",
    documentLimiter,
    uploadVerificationDocument,
    uploadVerificationDocumentHandler,
  );
  router.delete(
    "/:id/documents/:documentId",
    documentLimiter,
    deleteVerificationDocumentHandler,
  );
  router.get(
    "/:id/documents/:documentId/download",
    documentLimiter,
    downloadVerificationDocumentHandler,
  );
  router.get("/:id", getVerificationHandler);

  return router;
}

export function createAdminVerificationsRouter(): Router {
  const router = Router();
  router.use(
    authenticate,
    requireRoles("admin"),
    adminVerificationLimiter,
  );

  router.get("/", adminListVerificationsHandler);
  router.get("/:id", adminGetVerificationHandler);
  router.post("/:id/approve", adminApproveVerificationHandler);
  router.post("/:id/reject", adminRejectVerificationHandler);

  return router;
}
