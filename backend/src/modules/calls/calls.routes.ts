import { Router } from "express";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import {
  acceptCallHandler,
  createCallHandler,
  endCallHandler,
  getCallConfigHandler,
  getCallHandler,
  listCallsHandler,
  rejectCallHandler,
} from "./calls.controller.js";

const callLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: env.CALL_RATE_LIMIT_PER_MINUTE,
  message: "Too many call requests. Please slow down and try again shortly.",
});

export function createCallsRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.get("/config", getCallConfigHandler);
  router.post("/", callLimiter, createCallHandler);
  router.get("/", listCallsHandler);
  router.get("/:id", getCallHandler);
  router.post("/:id/accept", callLimiter, acceptCallHandler);
  router.post("/:id/reject", callLimiter, rejectCallHandler);
  router.post("/:id/end", callLimiter, endCallHandler);

  return router;
}
