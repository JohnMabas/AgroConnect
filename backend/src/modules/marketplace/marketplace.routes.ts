import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  listMarketplaceListingsHandler,
  getMarketplaceListingHandler,
  listMarketplaceBuyerRequestsHandler,
  getMarketplaceBuyerRequestHandler,
} from "./marketplace.controller.js";

export function createMarketplaceRouter(): Router {
  const router = Router();

  // All marketplace discovery requires authentication so that future phases can
  // personalise results and apply account-level visibility rules safely.
  router.use(authenticate);

  router.get("/listings", listMarketplaceListingsHandler);
  router.get("/listings/:id", getMarketplaceListingHandler);
  router.get("/requests", listMarketplaceBuyerRequestsHandler);
  router.get("/requests/:id", getMarketplaceBuyerRequestHandler);

  return router;
}
