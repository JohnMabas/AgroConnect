import type { Request, Response, NextFunction } from "express";
import type { ZodError } from "zod";
import {
  CreateListingSchema,
  ListListingsQuerySchema,
  UpdateListingSchema,
} from "./listings.validation.js";
import {
  createListing,
  listPublishedListings,
  getMyListings,
  getListingById,
  updateListing,
  publishListing,
  pauseListing,
  resumeListing,
  closeListing,
  deleteListing,
} from "./listings.service.js";

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
    case "FORBIDDEN":
      res.status(403).json({ success: false, error: { message: e.message } });
      return;
    case "INVALID_OPERATION":
      res.status(422).json({ success: false, error: { message: e.message } });
      return;
    default:
      next(err);
  }
}

// ─── POST /api/listings ───────────────────────────────────────────────────────

export async function createListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const parsed = CreateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const listing = await createListing(req.user.sub, parsed.data);
    res.status(201).json({ success: true, message: "Listing created.", data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── GET /api/listings ───────────────────────────────────────────────────────

export async function listPublicListingsHandler(
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

// ─── GET /api/listings/me ─────────────────────────────────────────────────────

export async function getMyListingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10) || 20),
    );

    const result = await getMyListings(req.user.sub, page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/listings/:id ────────────────────────────────────────────────────

export async function getListingByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }
    const listing = await getListingById(
      id,
      req.user ? { userId: req.user.sub, roles: req.user.roles ?? [] } : undefined,
    );
    res.json({ success: true, data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── PUT /api/listings/:id ────────────────────────────────────────────────────

export async function updateListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }

    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }

    const parsed = UpdateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const listing = await updateListing(req.user.sub, id, parsed.data);
    res.json({ success: true, message: "Listing updated.", data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── PATCH /api/listings/:id/publish ─────────────────────────────────────────

export async function publishListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }
    const listing = await publishListing(req.user.sub, id);
    res.json({ success: true, message: "Listing published.", data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── PATCH /api/listings/:id/pause ───────────────────────────────────────────

export async function pauseListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }
    const listing = await pauseListing(req.user.sub, id);
    res.json({ success: true, message: "Listing paused.", data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── PATCH /api/listings/:id/resume ──────────────────────────────────────────

export async function resumeListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }
    const listing = await resumeListing(req.user.sub, id);
    res.json({ success: true, message: "Listing resumed.", data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── PATCH /api/listings/:id/close ───────────────────────────────────────────

export async function closeListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }
    const listing = await closeListing(req.user.sub, id);
    res.json({ success: true, message: "Listing closed.", data: { listing } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

// ─── DELETE /api/listings/:id ────────────────────────────────────────────────

export async function deleteListingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Authentication required." } });
      return;
    }
    const id = req.params["id"] as string | undefined;
    if (!id) {
      res.status(400).json({ success: false, error: { message: "Listing ID required." } });
      return;
    }
    await deleteListing(req.user.sub, id);
    res.json({ success: true, message: "Listing deleted." });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
