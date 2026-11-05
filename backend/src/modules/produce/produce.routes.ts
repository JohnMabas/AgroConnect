import { Router } from "express";
import {
  getCategoriesHandler,
  getTypesHandler,
  getTypeByIdHandler,
} from "./produce.controller.js";

export function createProduceRouter(): Router {
  const router = Router();

  // GET /api/produce/categories — public
  router.get("/categories", getCategoriesHandler);

  // GET /api/produce/types — public, ?category_id=uuid or ?category_slug=string
  router.get("/types", getTypesHandler);

  // GET /api/produce/types/:id — public
  router.get("/types/:id", getTypeByIdHandler);

  return router;
}
