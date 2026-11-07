import type { Request, Response, NextFunction } from "express";
import { z, type ZodError } from "zod";
import { ListListingsQuerySchema } from "../listings/listings.validation.js";
import { getListingById, listPublishedListings } from "../listings/listings.service.js";
import { ListBuyerRequestsQuerySchema } from "../buyer-requests/buyer-requests.validation.js";
import {
  getMarketplaceBuyerRequestById,
  listOpenBuyerRequests,
} from "../buyer-requests/buyer-requests.service.js";

const MarketplaceIdSchema = z.string().uuid("Invalid marketplace resource ID.");

function zodErrorToFields(err: ZodError) {
  return err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const e = err as Error & { code?: string };
  switch (e.code) {
    case "NOT_FOUND":
      res.status(404).json({ success: false, error: { message: e.message } });
      return;
    default:
      next(err);
  }
}

function parseId(req: Request, res: Response): string | undefined {
  const parsed = MarketplaceIdSchema.safeParse(req.params["id"]);
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

// ─── GET /api/marketplace/listings ───────────────────────────────────────────

export async function listMarketplaceListingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = ListListingsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const query = parsed.data;
    const result = await listPublishedListings({
      page: query.page,
      limit: query.limit,
      search: query.search,
      categorySlug: query.category_slug,
      produceTypeId: query.produce_type_id,
      location: query.location,
      minPrice: query.min_price,
      maxPrice: query.max_price,
      minQuantity: query.min_quantity,
      maxQuantity: query.max_quantity,
      currency: query.currency,
      sort: query.sort,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/marketplace/listings/:id ───────────────────────────────────────

export async function getMarketplaceListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const listing = await getListingById(id);
    if (listing.status !== "published" || !listing.is_available) {
      res.status(404).json({
        success: false,
        error: { message: "Listing not found." },
      });
      return;
    }

    res.json({ success: true, data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── GET /api/marketplace/requests ───────────────────────────────────────────

export async function listMarketplaceBuyerRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = ListBuyerRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listOpenBuyerRequests(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/marketplace/requests/:id ───────────────────────────────────────

export async function getMarketplaceBuyerRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const request = await getMarketplaceBuyerRequestById(id);
    res.json({ success: true, data: { request } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
