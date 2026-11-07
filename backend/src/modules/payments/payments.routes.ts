import express, { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  getRefundsHandler,
  initializePaymentHandler,
  paystackWebhookHandler,
  requestRefundHandler,
  verifyPaymentHandler,
} from "./payments.controller.js";

export function createPaymentsRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.post("/paystack/initialize", initializePaymentHandler);
  router.get("/paystack/verify/:reference", verifyPaymentHandler);
  router.post("/paystack/:reference/refund", requestRefundHandler);
  router.get("/paystack/:reference/refund", getRefundsHandler);

  return router;
}

export function createPaystackWebhookRouter(): Router {
  const router = Router();
  router.post(
    "/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    paystackWebhookHandler,
  );
  return router;
}
