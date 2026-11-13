import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import {
  adminAddParticipantHandler,
  adminCreateConfigurationHandler,
  adminGetConfigurationHandler,
  adminGetFeedbackHandler,
  adminGetMetricsHandler,
  adminGetReadinessHandler,
  adminListConfigurationsHandler,
  adminListFeedbackHandler,
  adminListParticipantsHandler,
  adminUpdateConfigurationHandler,
  adminUpdateFeedbackHandler,
  adminUpdateParticipantHandler,
  adminUpdateReadinessHandler,
  getActiveConfigurationHandler,
  getMyFeedbackHandler,
  getMyParticipationHandler,
  listMyFeedbackHandler,
  submitFeedbackHandler,
} from "./pilot.controller.js";

export function createAdminPilotRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRoles("admin"));

  router.get("/readiness", adminGetReadinessHandler);

  router.get("/configurations", adminListConfigurationsHandler);
  router.post("/configurations", adminCreateConfigurationHandler);
  router.get(
    "/configurations/:configurationId",
    adminGetConfigurationHandler,
  );
  router.patch(
    "/configurations/:configurationId",
    adminUpdateConfigurationHandler,
  );
  router.patch(
    "/configurations/:configurationId/readiness/:moduleKey",
    adminUpdateReadinessHandler,
  );

  router.get(
    "/configurations/:configurationId/participants",
    adminListParticipantsHandler,
  );
  router.post(
    "/configurations/:configurationId/participants",
    adminAddParticipantHandler,
  );
  router.patch(
    "/configurations/:configurationId/participants/:participantId",
    adminUpdateParticipantHandler,
  );

  router.get(
    "/configurations/:configurationId/metrics",
    adminGetMetricsHandler,
  );

  router.get("/feedback", adminListFeedbackHandler);
  router.get("/feedback/:feedbackId", adminGetFeedbackHandler);
  router.patch("/feedback/:feedbackId", adminUpdateFeedbackHandler);

  return router;
}

export function createPilotRouter(): Router {
  const router = Router();
  router.use(authenticate);

  router.get("/configuration", getActiveConfigurationHandler);
  router.get("/me", getMyParticipationHandler);
  router.post("/feedback", submitFeedbackHandler);
  router.get("/feedback", listMyFeedbackHandler);
  router.get("/feedback/:feedbackId", getMyFeedbackHandler);

  return router;
}
