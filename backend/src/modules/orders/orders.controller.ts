import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  CancelOrderSchema,
  CreateOrderSchema,
  ListOrdersQuerySchema,
  OrderIdSchema,
  UpdateOrderStatusSchema,
} from "./orders.validation.js";
import {
  cancelOrder,
  createOrder,
  getOrderById,
  getOrderHistory,
  getOrderReservation,
  listOrders,
  updateOrderStatus,
} from "./orders.service.js";
import { publishOrderUpdated } from "./orders.events.js";
import { listOrderPayments } from "../payments/payments.service.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
}

function requireAuth(req: Request, res: Response): boolean {
  if (!req.user) {
    res
      .status(401)
      .json({ success: false, error: { message: "Authentication required." } });
    return false;
  }
  return true;
}

function parseOrderId(req: Request, res: Response): string | undefined {
  const parsed = OrderIdSchema.safeParse(req.params["id"]);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: zodErrorToFields(parsed.error),
    });
    return undefined;
  }
  return parsed.data;
}

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const error = err as Error & { code?: string; status?: number };
  switch (error.code) {
    case "NOT_FOUND":
      res
        .status(404)
        .json({ success: false, error: { message: error.message } });
      return;
    case "FORBIDDEN":
      res
        .status(403)
        .json({ success: false, error: { message: error.message } });
      return;
    case "INVALID_OPERATION":
      res
        .status(422)
        .json({ success: false, error: { message: error.message } });
      return;
    case "CONFLICT":
      res
        .status(409)
        .json({ success: false, error: { message: error.message } });
      return;
    default:
      next(err);
  }
}

export async function createOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const order = await createOrder(req.user!.sub, parsed.data);
    publishOrderUpdated(order, "created", req.user!.sub);
    res.status(201).json({
      success: true,
      message: "Order created.",
      data: { order },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = ListOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listOrders(req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOrderId(req, res);
    if (!id) return;

    const order = await getOrderById(req.user!.sub, id);
    res.json({ success: true, data: { order } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getOrderHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOrderId(req, res);
    if (!id) return;

    const history = await getOrderHistory(req.user!.sub, id);
    res.json({ success: true, data: { history } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getOrderReservationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOrderId(req, res);
    if (!id) return;

    const reservation = await getOrderReservation(req.user!.sub, id);
    res.json({ success: true, data: { reservation } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getOrderPaymentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOrderId(req, res);
    if (!id) return;

    const payments = await listOrderPayments(req.user!.sub, id);
    res.json({ success: true, data: { payments } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function updateOrderStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOrderId(req, res);
    if (!id) return;

    const parsed = UpdateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const order = await updateOrderStatus(req.user!.sub, id, parsed.data);
    publishOrderUpdated(order, "status_changed", req.user!.sub);
    res.json({
      success: true,
      message: "Order status updated.",
      data: { order },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function cancelOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOrderId(req, res);
    if (!id) return;

    const parsed = CancelOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const order = await cancelOrder(req.user!.sub, id, parsed.data);
    publishOrderUpdated(order, "cancelled", req.user!.sub);
    res.json({
      success: true,
      message: "Order cancelled.",
      data: { order },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
