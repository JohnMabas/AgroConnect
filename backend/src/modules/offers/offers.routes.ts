import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "../messaging/messaging.rate-limit.js";
import {
  acceptOfferHandler,
  counterOfferHandler,
  createOfferHandler,
  getOfferHandler,
  getOfferHistoryHandler,
  listOffersHandler,
  rejectOfferHandler,
  withdrawOfferHandler,
} from "./offers.controller.js";

const createLimiter = createFixedWindowLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: "Too many offers. Please try again later.",
});

const counterLimiter = createFixedWindowLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: "Too many counteroffers. Please try again later.",
});

const actionLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many offer actions. Please slow down and try again shortly.",
});

export function createOffersRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.post("/", createLimiter, createOfferHandler);
  router.get("/", listOffersHandler);

  router.get("/:id/history", getOfferHistoryHandler);
  router.get("/:id", getOfferHandler);

  router.post("/:id/accept", actionLimiter, acceptOfferHandler);
  router.post("/:id/reject", actionLimiter, rejectOfferHandler);
  router.post("/:id/withdraw", actionLimiter, withdrawOfferHandler);
  router.post("/:id/counter", counterLimiter, counterOfferHandler);

  return router;
}
