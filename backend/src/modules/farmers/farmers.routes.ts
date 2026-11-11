import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { getProfile, createProfile, updateProfile } from "./farmers.controller.js";
import {
  addEvidenceHandler,
  approveHandler,
  createComplaintHandler,
  createFarmerRelationshipHandler,
  downloadEvidenceHandler,
  getFarmerComplaintHandler,
  grantConsentHandler,
  listConsentRecordsHandler,
  listFarmerApprovalsHandler,
  listFarmerAuditHandler,
  listFarmerComplaintsHandler,
  listFarmerRelationshipsHandler,
  rejectHandler,
  revokeRelationshipHandler,
} from "../farmer-protection/farmer-protection.controller.js";
import { uploadVerificationDocument } from "../verifications/verification-document.upload.js";

export function createFarmersRouter(): Router {
  const router = Router();

  // POST /api/farmers/profile — create farmer profile
  router.post("/profile", authenticate, createProfile);

  // GET /api/farmers/profile/me — get my farmer profile
  router.get("/profile/me", authenticate, getProfile);

  // PUT /api/farmers/profile/me — update my farmer profile
  router.put("/profile/me", authenticate, updateProfile);

  // Phase 16 — farmer-controlled agent access, approvals and complaints.
  router.get(
    "/me/agent-relationships",
    authenticate,
    requireRoles("farmer"),
    listFarmerRelationshipsHandler,
  );
  router.post(
    "/me/agent-relationships",
    authenticate,
    requireRoles("farmer"),
    createFarmerRelationshipHandler,
  );
  router.post(
    "/me/agent-relationships/:relationshipId/consent",
    authenticate,
    requireRoles("farmer"),
    grantConsentHandler,
  );
  router.post(
    "/me/agent-relationships/:relationshipId/revoke",
    authenticate,
    requireRoles("farmer"),
    revokeRelationshipHandler,
  );
  router.get(
    "/me/consent-records",
    authenticate,
    requireRoles("farmer"),
    listConsentRecordsHandler,
  );
  router.get(
    "/me/approvals",
    authenticate,
    requireRoles("farmer"),
    listFarmerApprovalsHandler,
  );
  router.post(
    "/me/approvals/:approvalId/approve",
    authenticate,
    requireRoles("farmer"),
    approveHandler,
  );
  router.post(
    "/me/approvals/:approvalId/reject",
    authenticate,
    requireRoles("farmer"),
    rejectHandler,
  );
  router.get(
    "/me/audit",
    authenticate,
    requireRoles("farmer"),
    listFarmerAuditHandler,
  );
  router.post(
    "/me/complaints",
    authenticate,
    requireRoles("farmer"),
    createComplaintHandler,
  );
  router.get(
    "/me/complaints",
    authenticate,
    requireRoles("farmer"),
    listFarmerComplaintsHandler,
  );
  router.get(
    "/me/complaints/:complaintId",
    authenticate,
    requireRoles("farmer"),
    getFarmerComplaintHandler,
  );
  router.post(
    "/me/complaints/:complaintId/evidence",
    authenticate,
    requireRoles("farmer"),
    uploadVerificationDocument,
    addEvidenceHandler,
  );
  router.get(
    "/me/complaints/:complaintId/evidence/:evidenceId/download",
    authenticate,
    requireRoles("farmer"),
    downloadEvidenceHandler,
  );

  return router;
}
