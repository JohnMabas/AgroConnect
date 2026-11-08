import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import { OrderIdSchema } from "../orders/orders.validation.js";
import {
  AssignTransporterSchema,
  CreateDeliverySchema,
  DeclineDeliverySchema,
  DeliveryIdSchema,
  ListDeliveriesQuerySchema,
  UpdateDeliveryStatusSchema,
} from "./deliveries.validation.js";
import {
  acceptDelivery,
  assignTransporter,
  createDelivery,
  declineDelivery,
  getDeliveryById,
  getDeliveryHistory,
  getOrderDelivery,
  listDeliveries,
  listMyDeliveries,
  updateDeliveryStatus,
} from "./deliveries.service.js";
import { publishDeliveryUpdated } from "./deliveries.events.js";

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

function parseParam(value: unknown, res: Response): string | undefined {
  const parsed = DeliveryIdSchema.safeParse(value);
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

export async function createDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = CreateDeliverySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const delivery = await createDelivery(req.user!.sub, parsed.data);
    publishDeliveryUpdated(delivery, "created", req.user!.sub);
    res.status(201).json({
      success: true,
      message: "Delivery request created.",
      data: { delivery },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listDeliveriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = ListDeliveriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listDeliveries(
      req.user!.sub,
      req.user!.roles ?? [],
      parsed.data,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listMyDeliveriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = ListDeliveriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listMyDeliveries(req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseParam(req.params["id"], res);
    if (!id) return;

    const delivery = await getDeliveryById(
      req.user!.sub,
      req.user!.roles ?? [],
      id,
    );
    res.json({ success: true, data: { delivery } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getDeliveryHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseParam(req.params["id"], res);
    if (!id) return;

    const history = await getDeliveryHistory(
      req.user!.sub,
      req.user!.roles ?? [],
      id,
    );
    res.json({ success: true, data: { history } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getOrderDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = OrderIdSchema.safeParse(req.params["orderId"]);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const delivery = await getOrderDelivery(
      req.user!.sub,
      req.user!.roles ?? [],
      parsed.data,
    );
    res.json({ success: true, data: { delivery } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

async function handleAssignment(
  req: Request,
  res: Response,
  next: NextFunction,
  reassign: boolean,
): Promise<void> {
  if (!requireAuth(req, res)) return;

  const id = parseParam(req.params["id"], res);
  if (!id) return;

  const parsed = AssignTransporterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: zodErrorToFields(parsed.error),
    });
    return;
  }

  try {
    const delivery = await assignTransporter(
      req.user!.sub,
      req.user!.roles ?? [],
      id,
      parsed.data.transporter_id,
      reassign,
    );
    publishDeliveryUpdated(
      delivery,
      reassign ? "reassigned" : "assigned",
      req.user!.sub,
    );
    res.json({
      success: true,
      message: reassign
        ? "Delivery reassigned to transporter."
        : "Delivery assigned to transporter.",
      data: { delivery },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function assignTransporterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handleAssignment(req, res, next, false);
}

export async function reassignTransporterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handleAssignment(req, res, next, true);
}

export async function acceptDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseParam(req.params["id"], res);
    if (!id) return;

    const delivery = await acceptDelivery(req.user!.sub, id);
    publishDeliveryUpdated(delivery, "accepted", req.user!.sub);
    res.json({
      success: true,
      message: "Delivery accepted.",
      data: { delivery },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function declineDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseParam(req.params["id"], res);
    if (!id) return;

    const parsed = DeclineDeliverySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const delivery = await declineDelivery(req.user!.sub, id, parsed.data);
    publishDeliveryUpdated(delivery, "declined", req.user!.sub);
    res.json({
      success: true,
      message: "Delivery declined.",
      data: { delivery },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function updateDeliveryStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseParam(req.params["id"], res);
    if (!id) return;

    const parsed = UpdateDeliveryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const delivery = await updateDeliveryStatus(
      req.user!.sub,
      req.user!.roles ?? [],
      id,
      parsed.data,
    );
    publishDeliveryUpdated(delivery, parsed.data.status, req.user!.sub);
    res.json({
      success: true,
      message: "Delivery status updated.",
      data: { delivery },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
