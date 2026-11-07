import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  cancelOrderHandler,
  createOrderHandler,
  getOrderHandler,
  getOrderHistoryHandler,
  getOrderPaymentsHandler,
  getOrderReservationHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
} from "./orders.controller.js";

export function createOrdersRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.post("/", createOrderHandler);
  router.get("/", listOrdersHandler);

  router.get("/:id/history", getOrderHistoryHandler);
  router.get("/:id/reservation", getOrderReservationHandler);
  router.get("/:id/payments", getOrderPaymentsHandler);
  router.get("/:id", getOrderHandler);

  router.patch("/:id/status", updateOrderStatusHandler);
  router.post("/:id/cancel", cancelOrderHandler);

  return router;
}
