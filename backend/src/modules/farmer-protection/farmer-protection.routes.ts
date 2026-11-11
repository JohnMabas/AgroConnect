import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { uploadVerificationDocument } from "../verifications/verification-document.upload.js";
import {
  adminAddInvestigationHandler,
  adminGetComplaintHandler,
  adminListAgentsHandler,
  adminListAuditHandler,
  adminListComplaintsHandler,
  adminSuspendAgentHandler,
  adminUpdateComplaintHandler,
  adminVerifyAgentHandler,
  downloadEvidenceHandler,
} from "./farmer-protection.controller.js";

export function createAdminFarmerProtectionRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRoles("admin"));

  router.get("/agents", adminListAgentsHandler);
  router.post("/agents/:agentProfileId/verify", adminVerifyAgentHandler);
  router.post("/agents/:agentProfileId/suspend", adminSuspendAgentHandler);

  router.get("/audit", adminListAuditHandler);

  router.get("/complaints", adminListComplaintsHandler);
  router.get("/complaints/:complaintId", adminGetComplaintHandler);
  router.patch("/complaints/:complaintId", adminUpdateComplaintHandler);
  router.post(
    "/complaints/:complaintId/investigations",
    adminAddInvestigationHandler,
  );
  router.get(
    "/complaints/:complaintId/evidence/:evidenceId/download",
    downloadEvidenceHandler,
  );

  return router;
}

export const farmerProtectionEvidenceUpload = uploadVerificationDocument;
