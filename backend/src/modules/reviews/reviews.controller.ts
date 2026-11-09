import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  AdminListReportsQuerySchema,
  AdminListReviewsQuerySchema,
  CreateReviewSchema,
  HideReviewSchema,
  ListMyReviewsQuerySchema,
  ListUserReviewsQuerySchema,
  ReportReviewSchema,
  ReviewIdSchema,
  ReviewReportIdSchema,
  UpdateReportStatusSchema,
  UpdateReviewSchema,
} from "./reviews.validation.js";
import {
  adminGetReport,
  adminGetReviewDetail,
  adminHideReview,
  adminListReports,
  adminListReviews,
  adminRestoreReview,
  adminUpdateReportStatus,
  createReview,
  getReviewById,
  getReviewSummary,
  listMyReviews,
  listReviewsForUser,
  reportReview,
  updateReview,
} from "./reviews.service.js";

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

function parseUuid(
  value: unknown,
  schema: typeof ReviewIdSchema,
  res: Response,
): string | undefined {
  const parsed = schema.safeParse(value);
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

function isAdmin(req: Request): boolean {
  return req.user?.roles?.includes("admin") ?? false;
}

export async function createReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreateReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const review = await createReview(req.user!.sub, parsed.data);
    res.status(201).json({
      success: true,
      message: "Review submitted.",
      data: { review },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], ReviewIdSchema, res);
    if (!id) return;

    res.json({
      success: true,
      data: {
        review: await getReviewById(id, req.user?.sub, isAdmin(req)),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listUserReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = parseUuid(req.params["userId"], ReviewIdSchema, res);
    if (!userId) return;

    const parsed = ListUserReviewsQuerySchema.safeParse(req.query);
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
      data: await listReviewsForUser(userId, parsed.data),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getReviewSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = parseUuid(req.params["userId"], ReviewIdSchema, res);
    if (!userId) return;

    res.json({
      success: true,
      data: { summary: await getReviewSummary(userId) },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listMyReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = ListMyReviewsQuerySchema.safeParse(req.query);
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
      data: await listMyReviews(req.user!.sub, parsed.data),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function updateReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], ReviewIdSchema, res);
    if (!id) return;

    const parsed = UpdateReviewSchema.safeParse(req.body);
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
      message: "Review updated.",
      data: { review: await updateReview(req.user!.sub, id, parsed.data) },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function reportReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], ReviewIdSchema, res);
    if (!id) return;

    const parsed = ReportReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Review report submitted.",
      data: { report: await reportReview(req.user!.sub, id, parsed.data) },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminListReviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminListReviewsQuerySchema.safeParse(req.query);
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
      data: await adminListReviews(parsed.data),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminGetReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], ReviewIdSchema, res);
    if (!id) return;

    res.json({
      success: true,
      data: await adminGetReviewDetail(id),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminHideReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], ReviewIdSchema, res);
    if (!id) return;

    const parsed = HideReviewSchema.safeParse(req.body);
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
      message: "Review hidden.",
      data: {
        review: await adminHideReview(req.user!.sub, id, parsed.data),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminRestoreReviewHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], ReviewIdSchema, res);
    if (!id) return;

    res.json({
      success: true,
      message: "Review restored.",
      data: { review: await adminRestoreReview(req.user!.sub, id) },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminListReportsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AdminListReportsQuerySchema.safeParse(req.query);
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
      data: await adminListReports(parsed.data),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminGetReportHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], ReviewReportIdSchema, res);
    if (!id) return;

    res.json({
      success: true,
      data: { report: await adminGetReport(id) },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminUpdateReportStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], ReviewReportIdSchema, res);
    if (!id) return;

    const parsed = UpdateReportStatusSchema.safeParse(req.body);
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
      message: "Review report updated.",
      data: {
        report: await adminUpdateReportStatus(
          req.user!.sub,
          id,
          parsed.data,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
