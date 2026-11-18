import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import {
  getCategoriesHandler,
  getTypesHandler,
  getTypeByIdHandler,
  setTypeImageHandler,
  deleteTypeImageHandler,
} from "./produce.controller.js";
import { uploadSinglePublicImage } from "../uploads/public-image.upload.middleware.js";

export function createProduceRouter(): Router {
  const router = Router();

  router.get("/categories", getCategoriesHandler);

  router.get("/types", getTypesHandler);

  router.get("/types/:id", getTypeByIdHandler);

  router.post(
    "/types/:id/image",
    authenticate,
    requireRoles("admin"),
    uploadSinglePublicImage(),
    setTypeImageHandler,
  );

  router.delete(
    "/types/:id/image",
    authenticate,
    requireRoles("admin"),
    deleteTypeImageHandler,
  );

  return router;
}
