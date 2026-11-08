import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  AdminListDeliveriesQuerySchema,
  ListNotificationsQuerySchema,
  NotificationDeliveryIdSchema,
  NotificationIdSchema,
  UpdateNotificationPreferencesSchema,
} from "./notifications.validation.js";
import {
  getNotificationById,
  getNotificationPreferencesForUser,
  getUnreadNotificationCount,
  listNotificationDeliveries,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  retryNotificationDelivery,
  updateNotificationPreferences,
} from "./notifications.service.js";

function zodErrorToFields(error: ZodError) {
  return error.errors.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
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

function parseUuid(value: unknown, res: Response): string | undefined {
  const parsed = NotificationIdSchema.safeParse(value);
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
  const error = err as Error & { code?: string };
  if (error.code === "NOT_FOUND") {
    res
      .status(404)
      .json({ success: false, error: { message: error.message } });
    return;
  }
  next(err);
}

export async function listNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = ListNotificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    res.json({
      success: true,
      data: await listNotifications(req.user!.sub, parsed.data),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function unreadNotificationCountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    res.json({
      success: true,
      data: { unread_count: await getUnreadNotificationCount(req.user!.sub) },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getNotificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], res);
    if (!id) return;

    res.json({
      success: true,
      data: {
        notification: await getNotificationById(req.user!.sub, id),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function markNotificationReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], res);
    if (!id) return;

    res.json({
      success: true,
      message: "Notification marked as read.",
      data: {
        notification: await markNotificationRead(req.user!.sub, id),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function markAllNotificationsReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const updated = await markAllNotificationsRead(req.user!.sub);
    res.json({
      success: true,
      message: "All notifications marked as read.",
      data: { updated },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getNotificationPreferencesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    res.json({
      success: true,
      data: {
        preferences: await getNotificationPreferencesForUser(req.user!.sub),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function updateNotificationPreferencesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = UpdateNotificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    res.json({
      success: true,
      message: "Notification preferences updated.",
      data: {
        preferences: await updateNotificationPreferences(
          req.user!.sub,
          parsed.data,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listNotificationDeliveriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = AdminListDeliveriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    res.json({
      success: true,
      data: await listNotificationDeliveries(parsed.data),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function retryNotificationDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = NotificationDeliveryIdSchema.safeParse(req.params["id"]);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    res.json({
      success: true,
      message: "Notification delivery retried.",
      data: {
        delivery: await retryNotificationDelivery(parsed.data),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
