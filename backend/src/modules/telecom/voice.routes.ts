import { Router } from "express";
import {
  createTelecomRateLimiter,
  telecomChannelEnabled,
  verifyTelecomCallback,
} from "./telecom.security.js";
import { voiceCallbackHandler } from "./voice.controller.js";

export function createVoiceRouter(): Router {
  const router = Router();

  // Africa's Talking uses a single voice callback URL for both incoming calls
  // and subsequent GetDigits/event notifications. Support the documented
  // aliases so either dashboard configuration works.
  router.post(
    ["/", "/incoming", "/events", "/callback"],
    telecomChannelEnabled("voice"),
    verifyTelecomCallback("voice"),
    createTelecomRateLimiter(),
    voiceCallbackHandler,
  );

  return router;
}
