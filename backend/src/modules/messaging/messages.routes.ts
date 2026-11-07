import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getUnreadCountHandler } from "./messages.controller.js";

export function createMessagesRouter(): Router {
  const router = Router();

  router.use(authenticate);

  // GET /api/messages/unread-count
  router.get("/unread-count", getUnreadCountHandler);

  return router;
}
