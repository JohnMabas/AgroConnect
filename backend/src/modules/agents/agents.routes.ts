import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { getMyAssignmentsHandler, getMyActivitiesHandler } from "./agents.controller.js";

export function createAgentsRouter(): Router {
  const router = Router();

  // GET /api/agents/me/assignments — get my active cooperative assignments
  router.get("/me/assignments", authenticate, requireRoles("cooperative_agent"), getMyAssignmentsHandler);

  // GET /api/agents/me/activities — get my activity log (paginated)
  router.get("/me/activities", authenticate, requireRoles("cooperative_agent"), getMyActivitiesHandler);

  return router;
}
