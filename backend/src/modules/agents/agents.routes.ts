import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { getMyAssignmentsHandler, getMyActivitiesHandler } from "./agents.controller.js";
import {
  createAgentRelationshipHandler,
  listAgentApprovalsHandler,
  listAgentAuditHandler,
  listAgentRelationshipsHandler,
  requestApprovalHandler,
} from "../farmer-protection/farmer-protection.controller.js";

export function createAgentsRouter(): Router {
  const router = Router();

  // GET /api/agents/me/assignments — get my active cooperative assignments
  router.get("/me/assignments", authenticate, requireRoles("cooperative_agent"), getMyAssignmentsHandler);

  // GET /api/agents/me/activities — get my activity log (paginated)
  router.get("/me/activities", authenticate, requireRoles("cooperative_agent"), getMyActivitiesHandler);

  // Phase 16 — consent-based farmer assistance. Agents never gain implicit access.
  router.get(
    "/me/relationships",
    authenticate,
    requireRoles("cooperative_agent"),
    listAgentRelationshipsHandler,
  );
  router.post(
    "/relationships",
    authenticate,
    requireRoles("cooperative_agent"),
    createAgentRelationshipHandler,
  );
  router.get(
    "/me/approvals",
    authenticate,
    requireRoles("cooperative_agent"),
    listAgentApprovalsHandler,
  );
  router.post(
    "/approvals",
    authenticate,
    requireRoles("cooperative_agent"),
    requestApprovalHandler,
  );
  router.get(
    "/me/audit",
    authenticate,
    requireRoles("cooperative_agent"),
    listAgentAuditHandler,
  );

  return router;
}
