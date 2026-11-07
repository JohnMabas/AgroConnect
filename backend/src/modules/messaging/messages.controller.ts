import type { NextFunction, Request, Response } from "express";
import { getUnreadCounts } from "./messages.service.js";
import {
  handleMessagingServiceError,
  requireMessagingAuth,
} from "./messaging.controller-helpers.js";

// ─── GET /api/messages/unread-count ──────────────────────────────────────────

export async function getUnreadCountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const result = await getUnreadCounts(req.user!.sub);
    res.json({ success: true, data: result });
  } catch (err) {
    handleMessagingServiceError(err, res, next);
  }
}
