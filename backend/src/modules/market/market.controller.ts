import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodTypeAny } from "zod";
import {
  AdminObservationsQuerySchema,
  ApproveObservationSchema,
  CreateMarketObservationSchema,
  DemandAnalyticsQuerySchema,
  GenerateInsightsSchema,
  InsightListQuerySchema,
  MarketIdSchema,
  MyObservationsQuerySchema,
  PriceCompareQuerySchema,
  PriceListQuerySchema,
  PriceTrendQuerySchema,
  RejectObservationSchema,
  SupplyAnalyticsQuerySchema,
  TransactionAnalyticsQuerySchema,
} from "./market.validation.js";
import {
  getDemandAnalytics,
  getSupplyAnalytics,
  getTransactionAnalytics,
} from "./market.analytics.service.js";
import {
  compareMarketPrices,
  getPriceTrends,
  listMarketPrices,
} from "./market.prices.service.js";
import {
  approveMarketObservation,
  createMarketObservation,
  getObservationDetail,
  listAdminObservations,
  listMyObservations,
  rejectMarketObservation,
} from "./market.observations.service.js";
import {
  generateMarketInsights,
  getMarketInsight,
  listMarketInsights,
} from "./market.insights.service.js";
import { resolveMarketScope } from "./market.scope.js";
import type { MarketAccessScope } from "./market.types.js";

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

function validationError(res: Response, error: ZodError): void {
  res.status(422).json({
    success: false,
    message: "Validation failed.",
    errors: zodErrorToFields(error),
  });
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
    case "VALIDATION_ERROR":
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

function parseWithSchema<T extends ZodTypeAny>(
  schema: T,
  value: unknown,
  res: Response,
): T["_output"] | undefined {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return undefined;
  }
  return parsed.data as T["_output"];
}

async function scopeFor(req: Request): Promise<MarketAccessScope> {
  return resolveMarketScope(req.user!.sub, req.user!.roles ?? []);
}

export async function listMarketPricesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(PriceListQuerySchema, req.query, res);
    if (!query) return;
    const scope = await scopeFor(req);
    res.json({
      success: true,
      data: await listMarketPrices(query, scope),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getPriceTrendsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(PriceTrendQuerySchema, req.query, res);
    if (!query) return;
    const scope = await scopeFor(req);
    res.json({
      success: true,
      data: await getPriceTrends(query, scope),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function compareMarketPricesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(PriceCompareQuerySchema, req.query, res);
    if (!query) return;
    const scope = await scopeFor(req);
    res.json({
      success: true,
      data: {
        comparisons: await compareMarketPrices(query, scope),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getSupplyAnalyticsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(SupplyAnalyticsQuerySchema, req.query, res);
    if (!query) return;
    const scope = await scopeFor(req);
    res.json({
      success: true,
      data: await getSupplyAnalytics(query, scope),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getDemandAnalyticsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(DemandAnalyticsQuerySchema, req.query, res);
    if (!query) return;
    const scope = await scopeFor(req);
    res.json({
      success: true,
      data: await getDemandAnalytics(query, scope),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getTransactionAnalyticsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(
      TransactionAnalyticsQuerySchema,
      req.query,
      res,
    );
    if (!query) return;
    const scope = await scopeFor(req);
    res.json({
      success: true,
      data: await getTransactionAnalytics(query, scope),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function createMarketObservationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const input = parseWithSchema(CreateMarketObservationSchema, req.body, res);
    if (!input) return;
    res.status(201).json({
      success: true,
      message: "Market observation submitted for review.",
      data: {
        observation: await createMarketObservation(
          req.user!.sub,
          req.user!.roles ?? [],
          input,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listMyObservationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(MyObservationsQuerySchema, req.query, res);
    if (!query) return;
    res.json({
      success: true,
      data: await listMyObservations(req.user!.sub, query),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getObservationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseWithSchema(MarketIdSchema, req.params["id"], res);
    if (!id) return;
    const isAdmin = req.user!.roles?.includes("admin") ?? false;
    const scope = await scopeFor(req);
    res.json({
      success: true,
      data: {
        observation: await getObservationDetail(
          id,
          req.user!.sub,
          isAdmin,
          scope,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listAdminObservationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(AdminObservationsQuerySchema, req.query, res);
    if (!query) return;
    res.json({
      success: true,
      data: await listAdminObservations(query),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function approveObservationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseWithSchema(MarketIdSchema, req.params["id"], res);
    if (!id) return;
    const input = parseWithSchema(ApproveObservationSchema, req.body ?? {}, res);
    if (!input) return;
    res.json({
      success: true,
      message: "Market observation approved.",
      data: {
        observation: await approveMarketObservation(req.user!.sub, id, input),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function rejectObservationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseWithSchema(MarketIdSchema, req.params["id"], res);
    if (!id) return;
    const input = parseWithSchema(RejectObservationSchema, req.body, res);
    if (!input) return;
    res.json({
      success: true,
      message: "Market observation rejected.",
      data: {
        observation: await rejectMarketObservation(req.user!.sub, id, input),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listMarketInsightsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseWithSchema(InsightListQuerySchema, req.query, res);
    if (!query) return;
    res.json({
      success: true,
      data: await listMarketInsights(query),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getMarketInsightHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseWithSchema(MarketIdSchema, req.params["id"], res);
    if (!id) return;
    res.json({
      success: true,
      data: {
        insight: await getMarketInsight(id),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function generateMarketInsightsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const input = parseWithSchema(GenerateInsightsSchema, req.body ?? {}, res);
    if (!input) return;
    res.status(201).json({
      success: true,
      message: "Market insights generated.",
      data: await generateMarketInsights(input),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
