import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getProfile, createProfile, updateProfile } from "./farmers.controller.js";

export function createFarmersRouter(): Router {
  const router = Router();

  // POST /api/farmers/profile — create farmer profile
  router.post("/profile", authenticate, createProfile);

  // GET /api/farmers/profile/me — get my farmer profile
  router.get("/profile/me", authenticate, getProfile);

  // PUT /api/farmers/profile/me — update my farmer profile
  router.put("/profile/me", authenticate, updateProfile);

  return router;
}
