import type { Request, Response, NextFunction } from "express";
import {
  listCategories,
  listTypes,
  getTypeById,
  setProduceTypeImage,
  deleteProduceTypeImage,
} from "./produce.service.js";
import { handleImageServiceError } from "../uploads/public-image.controller.js";

// ─── GET /api/produce/categories ─────────────────────────────────────────────

export async function getCategoriesHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await listCategories();
    res.json({ success: true, data: { categories } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/produce/types ───────────────────────────────────────────────────

export async function getTypesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categoryId =
      typeof req.query["category_id"] === "string" ? req.query["category_id"] : undefined;
    const categorySlug =
      typeof req.query["category_slug"] === "string" ? req.query["category_slug"] : undefined;

    const types = await listTypes({ categoryId, categorySlug });
    res.json({ success: true, data: { types } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/produce/types/:id ───────────────────────────────────────────────

export async function getTypeByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Produce type ID required." } });
      return;
    }
    const type = await getTypeById(id);
    res.json({ success: true, data: { type } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    }
    next(err);
  }
}

export async function setTypeImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const typeId = req.params["id"] as string | undefined;
    if (!typeId) {
      res.status(400).json({ success: false, error: { message: "Produce type ID required." } });
      return;
    }

    const type = await setProduceTypeImage(typeId, req.file);
    res.json({ success: true, message: "Produce image uploaded.", data: { type } });
  } catch (err) {
    handleImageServiceError(err, res, next);
  }
}

export async function deleteTypeImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const typeId = req.params["id"] as string | undefined;
    if (!typeId) {
      res.status(400).json({ success: false, error: { message: "Produce type ID required." } });
      return;
    }

    const type = await deleteProduceTypeImage(typeId);
    res.json({ success: true, message: "Produce image removed.", data: { type } });
  } catch (err) {
    handleImageServiceError(err, res, next);
  }
}
