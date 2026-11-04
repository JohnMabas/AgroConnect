import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import {
  createCooperativeHandler,
  getMyCooperativeHandler,
  updateMyCooperativeHandler,
  listApprovedCooperativesHandler,
  getCooperativeByIdHandler,
  adminListCooperativesHandler,
  adminApproveCooperativeHandler,
  adminRejectCooperativeHandler,
  adminSuspendCooperativeHandler,
  requestMembershipHandler,
  listMembershipsHandler,
  getMyMembershipsHandler,
  updateMembershipHandler,
  leaveMembershipHandler,
  assignAgentHandler,
  listAgentsHandler,
  deactivateAgentHandler,
} from "./cooperatives.controller.js";

export function createCooperativesRouter(): Router {
  const router = Router();

  // ─── Admin sub-routes (must come before /:id routes to avoid conflict) ──────
  router.get("/admin/review", authenticate, requireRoles("admin"), adminListCooperativesHandler);
  router.patch("/admin/:id/approve", authenticate, requireRoles("admin"), adminApproveCooperativeHandler);
  router.patch("/admin/:id/reject", authenticate, requireRoles("admin"), adminRejectCooperativeHandler);
  router.patch("/admin/:id/suspend", authenticate, requireRoles("admin"), adminSuspendCooperativeHandler);

  // ─── My memberships (must come before /:id routes) ────────────────────────
  router.get("/memberships/me", authenticate, getMyMembershipsHandler);

  // ─── Cooperative CRUD ──────────────────────────────────────────────────────
  router.post("/", authenticate, createCooperativeHandler);
  router.get("/me", authenticate, getMyCooperativeHandler);
  router.put("/me/:id", authenticate, updateMyCooperativeHandler);
  router.get("/approved", listApprovedCooperativesHandler);
  router.get("/:id", getCooperativeByIdHandler);

  // ─── Memberships ──────────────────────────────────────────────────────────
  router.post("/:id/memberships", authenticate, requestMembershipHandler);
  router.get("/:id/memberships", authenticate, listMembershipsHandler);
  router.patch("/:id/memberships/:membershipId", authenticate, updateMembershipHandler);
  router.post("/:id/memberships/:membershipId/leave", authenticate, leaveMembershipHandler);

  // ─── Agents ───────────────────────────────────────────────────────────────
  router.post("/:id/agents", authenticate, requireRoles("cooperative"), assignAgentHandler);
  router.get("/:id/agents", authenticate, listAgentsHandler);
  router.patch("/:id/agents/:agentId", authenticate, requireRoles("cooperative"), deactivateAgentHandler);

  return router;
}
