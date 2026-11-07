import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import { emitToUser } from "../../realtime/registry.js";
import {
  CounterOfferSchema,
  CreateOfferSchema,
  ListOffersQuerySchema,
  OfferIdSchema,
} from "./offers.validation.js";
import type { OfferData } from "./offers.types.js";
import {
  acceptOffer,
  counterOffer,
  createOffer,
  getOfferById,
  getOfferHistory,
  listOffers,
  listOffersForBuyerRequest,
  listOffersForListing,
  rejectOffer,
  withdrawOffer,
} from "./offers.service.js";
import { publishOfferEvent, type OfferEventAction } from "./offers.events.js";

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

function parseOfferId(req: Request, res: Response): string | undefined {
  const parsed = OfferIdSchema.safeParse(req.params["id"]);
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
    default:
      next(err);
  }
}

function notifyOffer(
  offer: OfferData,
  action: OfferEventAction,
  actorUserId: string | null,
): void {
  const participantUserIds = [offer.buyer_id, offer.farmer_id];
  for (const participantUserId of participantUserIds) {
    emitToUser(participantUserId, "offer:updated", { action, offer });
  }
  publishOfferEvent({
    action,
    offer,
    actor_user_id: actorUserId,
    participant_user_ids: participantUserIds,
  });
}

export async function createOfferHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = CreateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const offer = await createOffer(req.user!.sub, parsed.data);
    notifyOffer(offer, "created", req.user!.sub);
    res.status(201).json({
      success: true,
      message: "Offer created.",
      data: { offer },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listOffersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const parsed = ListOffersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listOffers(req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getOfferHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOfferId(req, res);
    if (!id) return;

    const offer = await getOfferById(req.user!.sub, id);
    res.json({ success: true, data: { offer } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getOfferHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOfferId(req, res);
    if (!id) return;

    const history = await getOfferHistory(req.user!.sub, id);
    res.json({ success: true, data: { history } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

function offerActionHandler(
  action: (userId: string, id: string) => Promise<OfferData>,
  message: string,
  eventAction: OfferEventAction,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!requireAuth(req, res)) return;

      const id = parseOfferId(req, res);
      if (!id) return;

      const offer = await action(req.user!.sub, id);
      notifyOffer(offer, eventAction, req.user!.sub);
      res.json({ success: true, message, data: { offer } });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  };
}

export const acceptOfferHandler = offerActionHandler(
  acceptOffer,
  "Offer accepted.",
  "accepted",
);

export const rejectOfferHandler = offerActionHandler(
  rejectOffer,
  "Offer rejected.",
  "rejected",
);

export const withdrawOfferHandler = offerActionHandler(
  withdrawOffer,
  "Offer withdrawn.",
  "withdrawn",
);

export async function counterOfferHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const id = parseOfferId(req, res);
    if (!id) return;

    const parsed = CounterOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await counterOffer(req.user!.sub, id, parsed.data);
    notifyOffer(result.offer, "created", req.user!.sub);
    notifyOffer(result.countered_offer, "countered", req.user!.sub);
    res.status(201).json({
      success: true,
      message: "Counteroffer submitted.",
      data: {
        offer: result.offer,
        countered_offer: result.countered_offer,
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

async function listContextOffers(
  req: Request,
  res: Response,
  next: NextFunction,
  loader: (
    userId: string,
    contextId: string,
    filters: ReturnType<typeof ListOffersQuerySchema.parse>,
  ) => Promise<unknown>,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;

    const contextId = parseOfferId(req, res);
    if (!contextId) return;

    const parsed = ListOffersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await loader(req.user!.sub, contextId, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function listListingOffersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await listContextOffers(req, res, next, listOffersForListing);
}

export async function listBuyerRequestOffersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await listContextOffers(req, res, next, listOffersForBuyerRequest);
}
