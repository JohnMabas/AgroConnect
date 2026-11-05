import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../middleware/authenticate.js";
import {
  createListingHandler,
  listPublicListingsHandler,
  getMyListingsHandler,
  getListingByIdHandler,
  updateListingHandler,
  publishListingHandler,
  pauseListingHandler,
  resumeListingHandler,
  closeListingHandler,
  deleteListingHandler,
} from "./listings.controller.js";
import {
  addImageHandler,
  deleteImageHandler,
  setPrimaryImageHandler,
} from "./listings.images.controller.js";
import {
  getInventoryHandler,
  createAdjustmentHandler,
  getAdjustmentsHandler,
} from "./listings.inventory.controller.js";
import { uploadSingleImage } from "./listings.upload.middleware.js";

export function createListingsRouter(): Router {
  const router = Router();

  // ─── Listing CRUD ──────────────────────────────────────────────────────────

  // GET /api/listings — public discovery, search/filter/pagination
  router.get("/", listPublicListingsHandler);

  // POST /api/listings — create a new listing (authenticated)
  router.post("/", authenticate, createListingHandler);

  // GET /api/listings/me — my listings, paginated (must be before /:id)
  router.get("/me", authenticate, getMyListingsHandler);

  // GET /api/listings/:id — public, with optional auth so owners can read drafts
  router.get("/:id", optionalAuthenticate, getListingByIdHandler);

  // PUT /api/listings/:id — update listing (authenticated)
  router.put("/:id", authenticate, updateListingHandler);

  // ─── Status transitions ────────────────────────────────────────────────────

  router.patch("/:id/publish", authenticate, publishListingHandler);
  router.patch("/:id/pause", authenticate, pauseListingHandler);
  router.patch("/:id/resume", authenticate, resumeListingHandler);
  router.patch("/:id/close", authenticate, closeListingHandler);

  // DELETE /api/listings/:id — hard delete (draft only)
  router.delete("/:id", authenticate, deleteListingHandler);

  // ─── Images ───────────────────────────────────────────────────────────────

  // POST /api/listings/:id/images — upload a file or link an image URL
  router.post(
    "/:id/images",
    authenticate,
    uploadSingleImage,
    addImageHandler,
  );

  // DELETE /api/listings/:id/images/:imageId
  router.delete("/:id/images/:imageId", authenticate, deleteImageHandler);

  // PATCH /api/listings/:id/images/:imageId/primary
  router.patch("/:id/images/:imageId/primary", authenticate, setPrimaryImageHandler);

  // ─── Inventory ────────────────────────────────────────────────────────────

  // GET /api/listings/:id/inventory
  router.get("/:id/inventory", authenticate, getInventoryHandler);

  // POST /api/listings/:id/inventory/adjustments
  router.post("/:id/inventory/adjustments", authenticate, createAdjustmentHandler);

  // GET /api/listings/:id/inventory/adjustments
  router.get("/:id/inventory/adjustments", authenticate, getAdjustmentsHandler);

  return router;
}
