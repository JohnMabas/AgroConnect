import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getProfile, updateProfileHandler } from "./profiles.controller.js";

export function createProfilesRouter(): Router {
  const router = Router();

  router.get("/me", authenticate, getProfile);
  router.put("/me", authenticate, updateProfileHandler);

  return router;
}
