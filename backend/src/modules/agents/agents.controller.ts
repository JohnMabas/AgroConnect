import type { Request, Response, NextFunction } from "express";
import { getMyAssignments, getMyActivities } from "./agents.service.js";

function parsePagination(query: Record<string, unknown>): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(query["page"] ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query["limit"] ?? "20"), 10) || 20));
  return { page, limit };
}

// ─── GET /api/agents/me/assignments ──────────────────────────────────────────

export async function getMyAssignmentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const assignments = await getMyAssignments(req.user.sub);
    res.json({ success: true, data: { assignments } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/agents/me/activities ───────────────────────────────────────────

export async function getMyActivitiesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const result = await getMyActivities(req.user.sub, page, limit);
    res.json({ success: true, data: { ...result, page, limit } });
  } catch (err) {
    next(err);
  }
}
