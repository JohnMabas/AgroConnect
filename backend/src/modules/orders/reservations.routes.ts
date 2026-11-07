import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { listReservationsHandler } from "./reservations.controller.js";

export function createReservationsRouter(): Router {
  const router = Router();
  router.use(authenticate);
  router.get("/", listReservationsHandler);
  return router;
}
