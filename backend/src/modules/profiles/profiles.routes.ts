import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  getProfile,
  updateProfileHandler,
  uploadProfileImageHandler,
  deleteProfileImageHandler,
} from "./profiles.controller.js";
import { uploadSinglePublicImage } from "../uploads/public-image.upload.middleware.js";

export function createProfilesRouter(): Router {
  const router = Router();

  router.get("/me", authenticate, getProfile);
  router.put("/me", authenticate, updateProfileHandler);
  router.post(
    "/me/image",
    authenticate,
    uploadSinglePublicImage(),
    uploadProfileImageHandler,
  );
  router.delete("/me/image", authenticate, deleteProfileImageHandler);

  return router;
}
