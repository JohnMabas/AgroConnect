import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  createTelecomRateLimiter,
  telecomChannelEnabled,
  verifyTelecomCallback,
} from "./telecom.security.js";
import {
  getUssdSessionHandler,
  terminateUssdSessionHandler,
  ussdCallbackHandler,
} from "./ussd.controller.js";

export function createUssdRouter(): Router {
  const router = Router();

  // Africa's Talking posts the USSD callback to the configured URL. Support
  // both the bare mount path and the documented /callback alias.
  router.post(
    ["/", "/callback"],
    telecomChannelEnabled("ussd"),
    verifyTelecomCallback("ussd"),
    createTelecomRateLimiter(),
    ussdCallbackHandler,
  );

  // Internal session inspection. These are authenticated and restricted to the
  // session owner; administrators use the dedicated admin telecom routes.
  router.get("/session/:id", authenticate, getUssdSessionHandler);
  router.post(
    "/session/:id/terminate",
    authenticate,
    terminateUssdSessionHandler,
  );

  return router;
}
