import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  AdminAuditLogsQuerySchema,
  AdminListingsQuerySchema,
  AdminModerateListingSchema,
  AdminOrdersQuerySchema,
  AdminPaymentsQuerySchema,
  AdminRejectTransporterSchema,
  AdminTransportersQuerySchema,
  AdminUserStatusSchema,
  AdminUsersQuerySchema,
} from "./admin.validation.js";
import {
  getAdminOrder,
  getAdminOverview,
  getAdminUser,
  listAdminAuditLogs,
  listAdminListings,
  listAdminOrders,
  listAdminPayments,
  listAdminTransporters,
  listAdminUsers,
  moderateAdminListing,
  rejectAdminTransporter,
  updateAdminUserStatus,
} from "./admin.service.js";

function zodErrorToFields(error: ZodError) {
  return error.errors.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function requireAdminId(req: Request): string {
  if (!req.user) {
    throw Object.assign(new Error("Authentication required."), {
      code: "UNAUTHORIZED",
    });
  }
  return req.user.sub;
}

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  const e = error as Error & { code?: string };
  if (e.code === "NOT_FOUND") {
    res.status(404).json({ success: false, error: { message: e.message } });
    return;
  }
  if (e.code === "FORBIDDEN" || e.code === "UNAUTHORIZED") {
    res.status(403).json({ success: false, error: { message: e.message } });
    return;
  }
  if (e.code === "VALIDATION") {
    res.status(422).json({ success: false, error: { message: e.message } });
    return;
  }
  next(error);
}

function validationFailed(res: Response, error: ZodError): void {
  res.status(422).json({
    success: false,
    message: "Validation failed.",
    errors: zodErrorToFields(error),
  });
}

// ─── Overview ────────────────────────────────────────────────────────────────

export async function getOverviewHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const overview = await getAdminOverview();
    res.json({ success: true, data: { overview } });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const users = await listAdminUsers(parsed.data);
    res.json({ success: true, data: { users } });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function getUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getAdminUser(req.params["userId"] as string);
    res.json({ success: true, data: { user } });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function updateUserStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const adminId = requireAdminId(req);
    const user = await updateAdminUserStatus(
      adminId,
      req.params["userId"] as string,
      parsed.data,
    );
    res.json({
      success: true,
      message:
        parsed.data.status === "suspended"
          ? "User account suspended."
          : "User account reactivated.",
      data: { user },
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ─── Transporters ────────────────────────────────────────────────────────────

export async function listTransportersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminTransportersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const transporters = await listAdminTransporters(parsed.data);
    res.json({ success: true, data: { transporters } });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function rejectTransporterHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminRejectTransporterSchema.safeParse(req.body);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const adminId = requireAdminId(req);
    const transporter = await rejectAdminTransporter(
      adminId,
      req.params["id"] as string,
      parsed.data,
    );
    res.json({
      success: true,
      message: "Transporter application rejected.",
      data: { transporter },
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ─── Listings ────────────────────────────────────────────────────────────────

export async function listListingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminListingsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const listings = await listAdminListings(parsed.data);
    res.json({ success: true, data: { listings } });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function moderateListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminModerateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const adminId = requireAdminId(req);
    const listing = await moderateAdminListing(
      adminId,
      req.params["id"] as string,
      parsed.data,
    );
    res.json({
      success: true,
      message:
        parsed.data.action === "hide"
          ? "Listing hidden from the marketplace."
          : "Listing restored to the marketplace.",
      data: { listing },
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const orders = await listAdminOrders(parsed.data);
    res.json({ success: true, data: { orders } });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function getOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await getAdminOrder(req.params["orderId"] as string);
    res.json({ success: true, data: { order } });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function listPaymentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminPaymentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const payments = await listAdminPayments(parsed.data);
    res.json({ success: true, data: { payments } });
  } catch (error) {
    handleError(error, res, next);
  }
}

// ─── Audit logs ──────────────────────────────────────────────────────────────

export async function listAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminAuditLogsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationFailed(res, parsed.error);
      return;
    }
    const logs = await listAdminAuditLogs(parsed.data);
    // `logs` is already the paginated payload ({ logs, total, page, ... }).
    res.json({ success: true, data: logs });
  } catch (error) {
    handleError(error, res, next);
  }
}
