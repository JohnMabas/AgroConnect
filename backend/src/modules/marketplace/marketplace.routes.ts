import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../middleware/authenticate.js";
import {
  listMarketplaceListingsHandler,
  getMarketplaceListingHandler,
  listMarketplaceBuyerRequestsHandler,
  getMarketplaceBuyerRequestHandler,
} from "./marketplace.controller.js";

export function createMarketplaceRouter(): Router {
  const router = Router();

  // Listing discovery is public — unauthenticated visitors can browse produce.
  // A valid token is accepted and attached to req.user when present so future
  // phases can personalise results, but it is not required.
  router.get("/listings", optionalAuthenticate, listMarketplaceListingsHandler);
  router.get("/listings/:id", optionalAuthenticate, getMarketplaceListingHandler);

  // Buyer-request discovery still requires authentication.
  router.get("/requests", authenticate, listMarketplaceBuyerRequestsHandler);
  router.get("/requests/:id", authenticate, getMarketplaceBuyerRequestHandler);

  return router;
}
