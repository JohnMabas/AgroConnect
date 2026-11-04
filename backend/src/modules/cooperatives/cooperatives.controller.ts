import type { Request, Response, NextFunction } from "express";
import type { ZodError } from "zod";
import {
  CreateCooperativeSchema,
  UpdateCooperativeSchema,
  UpdateMembershipSchema,
  AssignAgentSchema,
  AdminReviewSchema,
  AdminRejectSchema,
} from "./cooperatives.validation.js";
import {
  createCooperative,
  getMyCooperative,
  updateMyCooperative,
  getCooperativeById,
  listApprovedCooperatives,
  adminListCooperatives,
  adminApproveCooperative,
  adminRejectCooperative,
  adminSuspendCooperative,
  requestMembership,
  listMemberships,
  getMyMemberships,
  updateMembershipStatus,
  assignAgent,
  listAgents,
  deactivateAgent,
} from "./cooperatives.service.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

function parsePagination(query: Record<string, unknown>): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(query["page"] ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query["limit"] ?? "20"), 10) || 20));
  return { page, limit };
}

// ─── Cooperative CRUD ─────────────────────────────────────────────────────────

export async function createCooperativeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const parsed = CreateCooperativeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(parsed.error) });
      return;
    }
    const cooperative = await createCooperative(req.user.sub, parsed.data);
    res.status(201).json({ success: true, message: "Cooperative registered. Awaiting admin approval.", data: { cooperative } });
  } catch (err) {
    next(err);
  }
}

export async function getMyCooperativeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const cooperative = await getMyCooperative(req.user.sub);
    res.json({ success: true, data: { cooperative } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function updateMyCooperativeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    if (!coopId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const parsed = UpdateCooperativeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(parsed.error) });
      return;
    }
    const cooperative = await updateMyCooperative(req.user.sub, coopId, parsed.data);
    res.json({ success: true, message: "Cooperative updated.", data: { cooperative } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function listApprovedCooperativesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const result = await listApprovedCooperatives(page, limit);
    res.json({ success: true, data: { ...result, page, limit } });
  } catch (err) {
    next(err);
  }
}

export async function getCooperativeByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const cooperative = await getCooperativeById(id);
    res.json({ success: true, data: { cooperative } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminListCooperativesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const status = req.query["status"] as string | undefined;
    const result = await adminListCooperatives(status, page, limit);
    res.json({ success: true, data: { ...result, page, limit } });
  } catch (err) {
    next(err);
  }
}

export async function adminApproveCooperativeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const parsed = AdminReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(parsed.error) });
      return;
    }
    const cooperative = await adminApproveCooperative(req.user.sub, id, parsed.data.notes);
    res.json({ success: true, message: "Cooperative approved.", data: { cooperative } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function adminRejectCooperativeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const parsed = AdminRejectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(parsed.error) });
      return;
    }
    const cooperative = await adminRejectCooperative(req.user.sub, id, parsed.data.notes);
    res.json({ success: true, message: "Cooperative rejected.", data: { cooperative } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function adminSuspendCooperativeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const parsed = AdminRejectSchema.safeParse(req.body);  // notes required for suspend too
    if (!parsed.success) {
      res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(parsed.error) });
      return;
    }
    const cooperative = await adminSuspendCooperative(req.user.sub, id, parsed.data.notes);
    res.json({ success: true, message: "Cooperative suspended.", data: { cooperative } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Memberships ──────────────────────────────────────────────────────────────

export async function requestMembershipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    if (!coopId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const membership = await requestMembership(req.user.sub, coopId);
    res.status(201).json({ success: true, message: "Membership request submitted.", data: { membership } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    if (e.code === "DUPLICATE_MEMBERSHIP" || e.code === "COOP_NOT_APPROVED") {
      res.status(409).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function listMembershipsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    if (!coopId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const memberships = await listMemberships(coopId, req.user.sub, req.user.roles ?? []);
    res.json({ success: true, data: { memberships } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "FORBIDDEN") {
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function getMyMembershipsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const memberships = await getMyMemberships(req.user.sub);
    res.json({ success: true, data: { memberships } });
  } catch (err) {
    next(err);
  }
}

export async function updateMembershipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    const membershipId = req.params["membershipId"] as string | undefined;
    if (!coopId || !membershipId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID and membership ID required." } });
      return;
    }
    const parsed = UpdateMembershipSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(parsed.error) });
      return;
    }
    const membership = await updateMembershipStatus(
      coopId,
      membershipId,
      req.user.sub,
      parsed.data.status,
      req.user.roles ?? [],
    );
    res.json({ success: true, message: "Membership status updated.", data: { membership } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    if (e.code === "FORBIDDEN") {
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function leaveMembershipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    const membershipId = req.params["membershipId"] as string | undefined;
    if (!coopId || !membershipId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID and membership ID required." } });
      return;
    }
    const membership = await updateMembershipStatus(
      coopId,
      membershipId,
      req.user.sub,
      "left",
      req.user.roles ?? [],
    );
    res.json({ success: true, message: "You have left the cooperative.", data: { membership } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    if (e.code === "FORBIDDEN") {
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export async function assignAgentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    if (!coopId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const parsed = AssignAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: "Validation failed.", errors: zodErrorToFields(parsed.error) });
      return;
    }
    const assignment = await assignAgent(coopId, parsed.data, req.user.sub);
    res.status(201).json({ success: true, message: "Agent assigned.", data: { assignment } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    if (e.code === "INVALID_AGENT" || e.code === "DUPLICATE_ASSIGNMENT" || e.code === "COOP_NOT_APPROVED") {
      res.status(409).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function listAgentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    if (!coopId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID required." } });
      return;
    }
    const assignments = await listAgents(coopId, req.user.sub, req.user.roles ?? []);
    res.json({ success: true, data: { assignments } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "FORBIDDEN") {
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function deactivateAgentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const coopId = req.params["id"] as string | undefined;
    const agentId = req.params["agentId"] as string | undefined;
    if (!coopId || !agentId) {
      res.status(400).json({ success: false, error: { message: "Cooperative ID and agent ID required." } });
      return;
    }
    const assignment = await deactivateAgent(coopId, agentId, req.user.sub);
    res.json({ success: true, message: "Agent deactivated.", data: { assignment } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}
