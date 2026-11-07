import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../middleware/authenticate.js";
import {
  createBuyerRequestHandler,
  listBuyerRequestsHandler,
  getMyBuyerRequestsHandler,
  getBuyerRequestByIdHandler,
  updateBuyerRequestHandler,
  pauseBuyerRequestHandler,
  reopenBuyerRequestHandler,
  fulfillBuyerRequestHandler,
  cancelBuyerRequestHandler,
} from "./buyer-requests.controller.js";
import { listBuyerRequestOffersHandler } from "../offers/offers.controller.js";

export function createBuyerRequestsRouter(): Router {
  const router = Router();

  // GET /api/buyer-requests — open buyer request discovery
  router.get("/", optionalAuthenticate, listBuyerRequestsHandler);

  // POST /api/buyer-requests — create an open request
  router.post("/", authenticate, createBuyerRequestHandler);

  // GET /api/buyer-requests/me — the authenticated user's requests
  router.get("/me", authenticate, getMyBuyerRequestsHandler);

  // GET /api/buyer-requests/:id — open requests are public; owners see all
  router.get("/:id", optionalAuthenticate, getBuyerRequestByIdHandler);

  // PUT /api/buyer-requests/:id — edit an owned open/paused request
  router.put("/:id", authenticate, updateBuyerRequestHandler);

  // Lifecycle transitions
  router.patch("/:id/pause", authenticate, pauseBuyerRequestHandler);
  router.patch("/:id/reopen", authenticate, reopenBuyerRequestHandler);
  router.patch("/:id/fulfill", authenticate, fulfillBuyerRequestHandler);
  router.patch("/:id/cancel", authenticate, cancelBuyerRequestHandler);

  // GET /api/buyer-requests/:id/offers — owner-only offer list
  router.get("/:id/offers", authenticate, listBuyerRequestOffersHandler);

  return router;
}
