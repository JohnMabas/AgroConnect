import { randomBytes } from "node:crypto";
import {
  Op,
  QueryTypes,
  type Includeable,
  type Order,
  type Transaction,
} from "sequelize";
import {
  BuyerRequest,
  Conversation,
  ConversationParticipant,
  Offer,
  OfferEvent,
  ProduceListing,
  User,
  sequelize,
} from "../../database/models/index.js";
import type { OfferStatus } from "../../database/models/offer.model.js";
import {
  compareDecimal,
  multiplyDecimal,
  normalizeDecimal,
} from "../listings/decimal.js";
import type {
  CounterOfferInput,
  CreateOfferInput,
  ListOffersQuery,
} from "./offers.validation.js";
import type {
  OfferBuyerRequestSummary,
  OfferData,
  OfferEventData,
  OfferHistory,
  OfferListingSummary,
  PaginatedOffers,
} from "./offers.types.js";

const QUANTITY_SCALE = 3;
const PRICE_SCALE = 2;
const AMOUNT_SCALE = 2;
const DEFAULT_EXPIRY_MS = 72 * 60 * 60 * 1000;
const MAX_OFFERS_PER_NEGOTIATION = 20;
const DEFAULT_EXPIRY_INTERVAL_MS = 15 * 60 * 1000;

type OfferRow = Offer & {
  buyer?: User;
  farmer?: User;
  listing?: ProduceListing;
  buyer_request?: BuyerRequest;
};

interface OfferContext {
  listing: ProduceListing | null;
  buyerRequest: BuyerRequest | null;
  buyerId: string;
  farmerId: string;
  unit: string;
  currency: string;
}

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildOfferNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(5).toString("hex").toUpperCase();
  return `OFF-${date}-${suffix}`;
}

function buildListingSummary(row: ProduceListing): OfferListingSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status ?? "draft",
    farmer_user_id: row.farmer_user_id,
    available_quantity: Number(row.available_quantity ?? 0),
    unit: row.unit ?? "kg",
    price_per_unit: Number(row.price_per_unit),
    currency: row.currency ?? "NGN",
  };
}

function buildBuyerRequestSummary(row: BuyerRequest): OfferBuyerRequestSummary {
  return {
    id: row.id,
    status: row.status ?? "open",
    buyer_user_id: row.buyer_user_id,
    requested_quantity: Number(row.requested_quantity),
    unit: row.unit,
    currency: row.currency ?? "NGN",
    expiry_date: row.expiry_date,
  };
}

function buildOfferData(row: OfferRow): OfferData {
  return {
    id: row.id,
    offer_number: row.offer_number,
    listing_id: row.listing_id ?? null,
    buyer_request_id: row.buyer_request_id ?? null,
    conversation_id: row.conversation_id ?? null,
    buyer_id: row.buyer_id,
    farmer_id: row.farmer_id,
    created_by: row.created_by,
    recipient_user_id:
      row.created_by === row.buyer_id ? row.farmer_id : row.buyer_id,
    parent_offer_id: row.parent_offer_id ?? null,
    root_offer_id: row.root_offer_id ?? null,
    quantity: Number(row.quantity),
    unit: row.unit,
    unit_price: Number(row.unit_price),
    total_amount: Number(row.total_amount),
    currency: row.currency ?? "NGN",
    delivery_terms: row.delivery_terms ?? null,
    delivery_location: row.delivery_location ?? null,
    delivery_date: row.delivery_date ?? null,
    buyer_message: row.buyer_message ?? null,
    status: (row.status ?? "pending") as OfferStatus,
    expires_at: row.expires_at,
    accepted_at: row.accepted_at ?? null,
    rejected_at: row.rejected_at ?? null,
    withdrawn_at: row.withdrawn_at ?? null,
    expired_at: row.expired_at ?? null,
    countered_at: row.countered_at ?? null,
    buyer: row.buyer
      ? { id: row.buyer.id, display_name: row.buyer.display_name ?? null }
      : undefined,
    farmer: row.farmer
      ? { id: row.farmer.id, display_name: row.farmer.display_name ?? null }
      : undefined,
    listing: row.listing ? buildListingSummary(row.listing) : undefined,
    buyer_request: row.buyer_request
      ? buildBuyerRequestSummary(row.buyer_request)
      : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildEventData(row: OfferEvent): OfferEventData {
  return {
    id: row.id,
    offer_id: row.offer_id,
    actor_user_id: row.actor_user_id ?? null,
    action: row.action,
    previous_status: row.previous_status ?? null,
    new_status: row.new_status ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at!,
  };
}

const offerIncludes: Includeable[] = [
  { model: User, as: "buyer", attributes: ["id", "display_name"] },
  { model: User, as: "farmer", attributes: ["id", "display_name"] },
  {
    model: ProduceListing,
    as: "listing",
    attributes: [
      "id",
      "title",
      "status",
      "farmer_user_id",
      "available_quantity",
      "unit",
      "price_per_unit",
      "currency",
    ],
  },
  {
    model: BuyerRequest,
    as: "buyer_request",
    attributes: [
      "id",
      "status",
      "buyer_user_id",
      "requested_quantity",
      "unit",
      "currency",
      "expiry_date",
    ],
  },
];

async function recordOfferEvent(
  offer: Offer,
  action: string,
  actorUserId: string | null,
  previousStatus: string | null,
  newStatus: string | null,
  metadata: Record<string, unknown> | null,
  transaction: Transaction,
): Promise<void> {
  await OfferEvent.create(
    {
      offer_id: offer.id,
      actor_user_id: actorUserId,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      metadata,
    },
    { transaction },
  );
}

async function findOfferForUpdate(
  id: string,
  transaction: Transaction,
): Promise<Offer> {
  const offer = await Offer.findByPk(id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!offer) {
    throw serviceError("Offer not found.", "NOT_FOUND");
  }
  return offer;
}

async function loadOfferRow(
  id: string,
  transaction?: Transaction,
): Promise<OfferRow> {
  const offer = (await Offer.findByPk(id, {
    include: offerIncludes,
    transaction,
  })) as OfferRow | null;
  if (!offer) {
    throw serviceError("Offer not found.", "NOT_FOUND");
  }
  return offer;
}

function assertParticipant(offer: Offer, userId: string): void {
  if (offer.buyer_id !== userId && offer.farmer_id !== userId) {
    throw serviceError("Offer not found.", "NOT_FOUND");
  }
}

function recipientOf(offer: Offer): string {
  return offer.created_by === offer.buyer_id
    ? offer.farmer_id
    : offer.buyer_id;
}

async function expireIfNeeded(
  offer: Offer,
  transaction: Transaction,
): Promise<boolean> {
  if (
    (offer.status ?? "pending") === "pending" &&
    new Date(offer.expires_at).getTime() <= Date.now()
  ) {
    const previousStatus = offer.status ?? "pending";
    await offer.update(
      { status: "expired", expired_at: new Date() },
      { transaction },
    );
    await recordOfferEvent(
      offer,
      "expired",
      null,
      previousStatus,
      "expired",
      { reason: "expires_at_passed" },
      transaction,
    );
    return true;
  }
  return false;
}

/**
 * Persist expiration for every overdue pending offer. The update and audit
 * insert run in one transaction and are safe to run repeatedly.
 */
export async function expireOffers(): Promise<number> {
  return sequelize.transaction(async (transaction) => {
    const rows = await sequelize.query<{ id: string }>(
      `UPDATE offers
       SET status = 'expired',
           expired_at = NOW(),
           updated_at = NOW()
       WHERE status = 'pending'
         AND expires_at <= NOW()
       RETURNING id`,
      { type: QueryTypes.SELECT, transaction },
    );

    if (rows.length > 0) {
      await OfferEvent.bulkCreate(
        rows.map((row) => ({
          offer_id: row.id,
          actor_user_id: null,
          action: "expired",
          previous_status: "pending",
          new_status: "expired",
          metadata: { reason: "expires_at_passed" },
        })),
        { transaction },
      );
    }

    return rows.length;
  });
}

let expiryTimer: NodeJS.Timeout | undefined;

export function startOfferExpiryJob(
  intervalMs = DEFAULT_EXPIRY_INTERVAL_MS,
): void {
  if (expiryTimer) return;

  const run = (): void => {
    void expireOffers().catch((error: unknown) => {
      console.error("Offer expiry sweep failed:", error);
    });
  };

  run();
  expiryTimer = setInterval(run, intervalMs);
  expiryTimer.unref();
}

export function stopOfferExpiryJob(): void {
  if (expiryTimer) {
    clearInterval(expiryTimer);
    expiryTimer = undefined;
  }
}

async function validateConversation(
  conversationId: string,
  userId: string,
  context: {
    listingId: string | null;
    buyerRequestId: string | null;
  },
  transaction: Transaction,
): Promise<void> {
  const conversation = await Conversation.findByPk(conversationId, {
    transaction,
  });
  if (!conversation) {
    throw serviceError("Conversation not found.", "NOT_FOUND");
  }

  const participants = await ConversationParticipant.findAll({
    where: { conversation_id: conversationId },
    attributes: ["user_id"],
    transaction,
  });
  const participantIds = participants.map((participant) => participant.user_id);

  if (!participantIds.includes(userId)) {
    throw serviceError("Conversation not found.", "NOT_FOUND");
  }

  if (conversation.listing_id && context.listingId !== conversation.listing_id) {
    throw serviceError(
      "The conversation does not match the offer listing.",
      "INVALID_OPERATION",
    );
  }
  if (
    conversation.buyer_request_id &&
    context.buyerRequestId !== conversation.buyer_request_id
  ) {
    throw serviceError(
      "The conversation does not match the buyer request.",
      "INVALID_OPERATION",
    );
  }
}

async function loadListing(
  id: string,
  transaction: Transaction,
  lock: boolean,
): Promise<ProduceListing | null> {
  return ProduceListing.findByPk(id, {
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
}

async function loadBuyerRequest(
  id: string,
  transaction: Transaction,
  lock: boolean,
): Promise<BuyerRequest | null> {
  return BuyerRequest.findByPk(id, {
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
}

function assertContextActive(
  context: OfferContext,
  quantity: number | string,
): void {
  const today = todayIsoDate();

  if (context.listing) {
    const listing = context.listing;
    if (listing.status !== "published") {
      throw serviceError(
        "Listing is not available for offers.",
        "INVALID_OPERATION",
      );
    }
    if (listing.expiry_date && listing.expiry_date < today) {
      throw serviceError("Listing has expired.", "INVALID_OPERATION");
    }
    if (listing.available_from && listing.available_from > today) {
      throw serviceError(
        "Listing is not yet available for offers.",
        "INVALID_OPERATION",
      );
    }
    if (
      compareDecimal(
        listing.available_quantity ?? 0,
        quantity,
        QUANTITY_SCALE,
      ) < 0
    ) {
      throw serviceError(
        "The requested quantity exceeds the listing's available quantity.",
        "INVALID_OPERATION",
      );
    }
  }

  if (context.buyerRequest) {
    const request = context.buyerRequest;
    if (request.status !== "open") {
      throw serviceError(
        "Buyer request is not accepting offers.",
        "INVALID_OPERATION",
      );
    }
    if (request.expiry_date < today) {
      throw serviceError("Buyer request has expired.", "INVALID_OPERATION");
    }
  }
}

async function resolveCreateContext(
  userId: string,
  input: CreateOfferInput,
  transaction: Transaction,
): Promise<OfferContext> {
  const listingId = input.listing_id ?? null;
  const buyerRequestId = input.buyer_request_id ?? null;

  if (!listingId && !buyerRequestId) {
    throw serviceError(
      "Provide either listing_id or buyer_request_id.",
      "INVALID_OPERATION",
    );
  }

  const listing = listingId
    ? await loadListing(listingId, transaction, true)
    : null;
  if (listingId && !listing) {
    throw serviceError("Listing not found.", "NOT_FOUND");
  }

  const buyerRequest = buyerRequestId
    ? await loadBuyerRequest(buyerRequestId, transaction, true)
    : null;
  if (buyerRequestId && !buyerRequest) {
    throw serviceError("Buyer request not found.", "NOT_FOUND");
  }

  let buyerId: string;
  let farmerId: string;

  if (listing && !buyerRequest) {
    if (userId === listing.farmer_user_id) {
      throw serviceError(
        "You cannot make an offer on your own listing.",
        "INVALID_OPERATION",
      );
    }
    buyerId = userId;
    farmerId = listing.farmer_user_id;
  } else if (buyerRequest && !listing) {
    if (userId === buyerRequest.buyer_user_id) {
      throw serviceError(
        "You cannot make an offer on your own buyer request.",
        "INVALID_OPERATION",
      );
    }
    buyerId = buyerRequest.buyer_user_id;
    farmerId = userId;
  } else if (listing && buyerRequest) {
    if (listing.farmer_user_id === buyerRequest.buyer_user_id) {
      throw serviceError(
        "The listing owner and buyer request owner must be different users.",
        "INVALID_OPERATION",
      );
    }
    if (
      userId !== listing.farmer_user_id &&
      userId !== buyerRequest.buyer_user_id
    ) {
      throw serviceError(
        "You are not a participant in this marketplace context.",
        "FORBIDDEN",
      );
    }
    buyerId = buyerRequest.buyer_user_id;
    farmerId = listing.farmer_user_id;
  } else {
    throw serviceError(
      "Provide either listing_id or buyer_request_id.",
      "INVALID_OPERATION",
    );
  }

  if (buyerId === farmerId) {
    throw serviceError(
      "Buyer and farmer must be different users.",
      "INVALID_OPERATION",
    );
  }

  if (listing && buyerRequest && listing.unit !== buyerRequest.unit) {
    throw serviceError(
      "The listing and buyer request use different units.",
      "INVALID_OPERATION",
    );
  }
  if (
    listing &&
    buyerRequest &&
    (listing.currency ?? "NGN") !== (buyerRequest.currency ?? "NGN")
  ) {
    throw serviceError(
      "The listing and buyer request use different currencies.",
      "INVALID_OPERATION",
    );
  }

  const unit = listing?.unit ?? buyerRequest!.unit;
  const currency =
    listing?.currency ?? buyerRequest?.currency ?? "NGN";

  if (input.unit !== unit) {
    throw serviceError(
      `The offer unit must match the marketplace context unit (${unit}).`,
      "INVALID_OPERATION",
    );
  }
  if (input.currency && input.currency !== currency) {
    throw serviceError(
      `The offer currency must match the marketplace context currency (${currency}).`,
      "INVALID_OPERATION",
    );
  }

  const participants = await User.findAll({
    where: { id: { [Op.in]: [buyerId, farmerId] } },
    attributes: ["id", "status"],
    transaction,
  });
  if (participants.length !== 2) {
    throw serviceError("Offer participant not found.", "NOT_FOUND");
  }
  if (participants.some((participant) => participant.status === "suspended")) {
    throw serviceError(
      "One of the offer participants is not available.",
      "INVALID_OPERATION",
    );
  }

  const context: OfferContext = {
    listing,
    buyerRequest,
    buyerId,
    farmerId,
    unit,
    currency,
  };
  assertContextActive(context, input.quantity);
  return context;
}

async function resolveCounterContext(
  parent: Offer,
  userId: string,
  input: CounterOfferInput,
  transaction: Transaction,
): Promise<OfferContext> {
  if (recipientOf(parent) !== userId) {
    throw serviceError(
      "Only the offer recipient can submit a counteroffer.",
      "FORBIDDEN",
    );
  }

  const listing = parent.listing_id
    ? await loadListing(parent.listing_id, transaction, true)
    : null;
  if (parent.listing_id && !listing) {
    throw serviceError("Listing not found.", "INVALID_OPERATION");
  }

  const buyerRequest = parent.buyer_request_id
    ? await loadBuyerRequest(parent.buyer_request_id, transaction, true)
    : null;
  if (parent.buyer_request_id && !buyerRequest) {
    throw serviceError("Buyer request not found.", "INVALID_OPERATION");
  }

  if (listing && buyerRequest && listing.unit !== buyerRequest.unit) {
    throw serviceError(
      "The listing and buyer request use different units.",
      "INVALID_OPERATION",
    );
  }
  if (
    listing &&
    buyerRequest &&
    (listing.currency ?? "NGN") !== (buyerRequest.currency ?? "NGN")
  ) {
    throw serviceError(
      "The listing and buyer request use different currencies.",
      "INVALID_OPERATION",
    );
  }

  const unit = listing?.unit ?? buyerRequest?.unit ?? parent.unit;
  const currency =
    listing?.currency ?? buyerRequest?.currency ?? parent.currency;

  if (input.unit !== unit) {
    throw serviceError(
      `The counteroffer unit must match the marketplace context unit (${unit}).`,
      "INVALID_OPERATION",
    );
  }
  if (input.currency && input.currency !== currency) {
    throw serviceError(
      `The counteroffer currency must match the marketplace context currency (${currency}).`,
      "INVALID_OPERATION",
    );
  }

  const context: OfferContext = {
    listing,
    buyerRequest,
    buyerId: parent.buyer_id,
    farmerId: parent.farmer_id,
    unit,
    currency,
  };
  assertContextActive(context, input.quantity);
  return context;
}

function buildTerms(
  context: OfferContext,
  input: CounterOfferInput | CreateOfferInput,
): {
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  expiresAt: Date;
} {
  const quantity = normalizeDecimal(input.quantity, QUANTITY_SCALE);
  const unitPrice = normalizeDecimal(input.unit_price, PRICE_SCALE);
  const totalAmount = multiplyDecimal(
    quantity,
    QUANTITY_SCALE,
    unitPrice,
    PRICE_SCALE,
    AMOUNT_SCALE,
  );

  return {
    quantity,
    unitPrice,
    totalAmount,
    expiresAt:
      input.expires_at ?? new Date(Date.now() + DEFAULT_EXPIRY_MS),
  };
}

async function ensureThreadLimit(
  rootOfferId: string,
  transaction: Transaction,
): Promise<void> {
  const count = await Offer.count({
    where: {
      [Op.or]: [{ id: rootOfferId }, { root_offer_id: rootOfferId }],
    },
    transaction,
  });
  if (count >= MAX_OFFERS_PER_NEGOTIATION) {
    throw serviceError(
      "This negotiation has reached the maximum number of offers.",
      "INVALID_OPERATION",
    );
  }
}

export async function createOffer(
  userId: string,
  input: CreateOfferInput,
): Promise<OfferData> {
  const offerId = await sequelize.transaction(async (transaction) => {
    const context = await resolveCreateContext(userId, input, transaction);

    if (input.conversation_id) {
      await validateConversation(
        input.conversation_id,
        userId,
        {
          listingId: input.listing_id ?? null,
          buyerRequestId: input.buyer_request_id ?? null,
        },
        transaction,
      );
    }

    const terms = buildTerms(context, input);
    const offer = await Offer.create(
      {
        offer_number: buildOfferNumber(),
        listing_id: input.listing_id ?? null,
        buyer_request_id: input.buyer_request_id ?? null,
        conversation_id: input.conversation_id ?? null,
        buyer_id: context.buyerId,
        farmer_id: context.farmerId,
        created_by: userId,
        parent_offer_id: null,
        root_offer_id: null,
        quantity: terms.quantity as unknown as number,
        unit: context.unit,
        unit_price: terms.unitPrice as unknown as number,
        total_amount: terms.totalAmount as unknown as number,
        currency: context.currency,
        delivery_terms: input.delivery_terms ?? null,
        delivery_location: input.delivery_location ?? null,
        delivery_date: input.delivery_date ?? null,
        buyer_message: input.buyer_message ?? null,
        status: "pending",
        expires_at: terms.expiresAt,
      },
      { transaction },
    );

    await recordOfferEvent(
      offer,
      "created",
      userId,
      null,
      "pending",
      {
        listing_id: offer.listing_id,
        buyer_request_id: offer.buyer_request_id,
      },
      transaction,
    );

    return offer.id;
  });

  return buildOfferData(await loadOfferRow(offerId));
}

export async function getOfferById(
  userId: string,
  id: string,
): Promise<OfferData> {
  await expireOffers();
  const offer = await loadOfferRow(id);
  assertParticipant(offer, userId);
  return buildOfferData(offer);
}

async function queryOffers(
  userId: string,
  filters: ListOffersQuery,
  forcedContext?: {
    listing_id?: string;
    buyer_request_id?: string;
  },
): Promise<PaginatedOffers> {
  await expireOffers();

  const conditions: Array<Record<string | symbol, unknown>> = [];
  const roleWhere =
    filters.role === "buyer"
      ? { buyer_id: userId }
      : filters.role === "farmer"
        ? { farmer_id: userId }
        : { [Op.or]: [{ buyer_id: userId }, { farmer_id: userId }] };

  conditions.push(roleWhere);

  if (filters.direction === "sent") {
    conditions.push({ created_by: userId });
  } else if (filters.direction === "received") {
    conditions.push({ created_by: { [Op.ne]: userId } });
  }

  if (filters.status) {
    conditions.push({ status: filters.status });
  }
  if (forcedContext?.listing_id ?? filters.listing_id) {
    conditions.push({
      listing_id: forcedContext?.listing_id ?? filters.listing_id,
    });
  }
  if (forcedContext?.buyer_request_id ?? filters.buyer_request_id) {
    conditions.push({
      buyer_request_id:
        forcedContext?.buyer_request_id ?? filters.buyer_request_id,
    });
  }
  if (filters.conversation_id) {
    conditions.push({ conversation_id: filters.conversation_id });
  }

  const where =
    conditions.length === 1
      ? conditions[0]
      : { [Op.and]: conditions };

  const order: Order =
    filters.sort === "expiring_soon"
      ? [
          ["expires_at", "ASC"],
          ["created_at", "ASC"],
        ]
      : [["created_at", "DESC"]];

  const { count, rows } = await Offer.findAndCountAll({
    where,
    include: offerIncludes,
    order,
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
    subQuery: false,
  });

  return {
    offers: (rows as OfferRow[]).map(buildOfferData),
    total: count,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(count / filters.limit),
  };
}

export async function listOffers(
  userId: string,
  filters: ListOffersQuery,
): Promise<PaginatedOffers> {
  return queryOffers(userId, filters);
}

export async function listOffersForListing(
  userId: string,
  listingId: string,
  filters: ListOffersQuery,
): Promise<PaginatedOffers> {
  const listing = await ProduceListing.findByPk(listingId);
  if (!listing) {
    throw serviceError("Listing not found.", "NOT_FOUND");
  }
  if (listing.farmer_user_id !== userId) {
    throw serviceError(
      "You do not have permission to view offers for this listing.",
      "FORBIDDEN",
    );
  }
  return queryOffers(userId, filters, { listing_id: listingId });
}

export async function listOffersForBuyerRequest(
  userId: string,
  buyerRequestId: string,
  filters: ListOffersQuery,
): Promise<PaginatedOffers> {
  const request = await BuyerRequest.findByPk(buyerRequestId);
  if (!request) {
    throw serviceError("Buyer request not found.", "NOT_FOUND");
  }
  if (request.buyer_user_id !== userId) {
    throw serviceError(
      "You do not have permission to view offers for this buyer request.",
      "FORBIDDEN",
    );
  }
  return queryOffers(userId, filters, { buyer_request_id: buyerRequestId });
}

export async function getOfferHistory(
  userId: string,
  id: string,
): Promise<OfferHistory> {
  await expireOffers();
  const offer = await loadOfferRow(id);
  assertParticipant(offer, userId);

  const rootOfferId = offer.root_offer_id ?? offer.id;
  const offers = (await Offer.findAll({
    where: {
      [Op.or]: [{ id: rootOfferId }, { root_offer_id: rootOfferId }],
    },
    include: offerIncludes,
    order: [["created_at", "ASC"]],
  })) as OfferRow[];

  const events = await OfferEvent.findAll({
    where: { offer_id: { [Op.in]: offers.map((row) => row.id) } },
    order: [["created_at", "ASC"]],
  });

  return {
    root_offer_id: rootOfferId,
    offers: offers.map(buildOfferData),
    events: events.map(buildEventData),
  };
}

export async function acceptOffer(
  userId: string,
  id: string,
): Promise<OfferData> {
  await sequelize.transaction(async (transaction) => {
    const offer = await findOfferForUpdate(id, transaction);
    assertParticipant(offer, userId);
    await expireIfNeeded(offer, transaction);

    if (recipientOf(offer) !== userId) {
      throw serviceError(
        "Only the offer recipient can accept this offer.",
        "FORBIDDEN",
      );
    }
    if ((offer.status ?? "pending") !== "pending") {
      throw serviceError(
        `Only pending offers can be accepted. This offer is ${offer.status}.`,
        "INVALID_OPERATION",
      );
    }

    const context: OfferContext = {
      listing: offer.listing_id
        ? await loadListing(offer.listing_id, transaction, true)
        : null,
      buyerRequest: offer.buyer_request_id
        ? await loadBuyerRequest(offer.buyer_request_id, transaction, true)
        : null,
      buyerId: offer.buyer_id,
      farmerId: offer.farmer_id,
      unit: offer.unit,
      currency: offer.currency,
    };
    assertContextActive(context, offer.quantity);

    await offer.update(
      { status: "accepted", accepted_at: new Date() },
      { transaction },
    );
    await recordOfferEvent(
      offer,
      "accepted",
      userId,
      "pending",
      "accepted",
      { accepted_quantity: Number(offer.quantity) },
      transaction,
    );
  });

  return buildOfferData(await loadOfferRow(id));
}

export async function rejectOffer(
  userId: string,
  id: string,
): Promise<OfferData> {
  await sequelize.transaction(async (transaction) => {
    const offer = await findOfferForUpdate(id, transaction);
    assertParticipant(offer, userId);
    await expireIfNeeded(offer, transaction);

    if (recipientOf(offer) !== userId) {
      throw serviceError(
        "Only the offer recipient can reject this offer.",
        "FORBIDDEN",
      );
    }
    if ((offer.status ?? "pending") !== "pending") {
      throw serviceError(
        `Only pending offers can be rejected. This offer is ${offer.status}.`,
        "INVALID_OPERATION",
      );
    }

    await offer.update(
      { status: "rejected", rejected_at: new Date() },
      { transaction },
    );
    await recordOfferEvent(
      offer,
      "rejected",
      userId,
      "pending",
      "rejected",
      null,
      transaction,
    );
  });

  return buildOfferData(await loadOfferRow(id));
}

export async function withdrawOffer(
  userId: string,
  id: string,
): Promise<OfferData> {
  await sequelize.transaction(async (transaction) => {
    const offer = await findOfferForUpdate(id, transaction);
    assertParticipant(offer, userId);
    await expireIfNeeded(offer, transaction);

    if (offer.created_by !== userId) {
      throw serviceError(
        "Only the offer creator can withdraw this offer.",
        "FORBIDDEN",
      );
    }
    if ((offer.status ?? "pending") !== "pending") {
      throw serviceError(
        `Only pending offers can be withdrawn. This offer is ${offer.status}.`,
        "INVALID_OPERATION",
      );
    }

    await offer.update(
      { status: "withdrawn", withdrawn_at: new Date() },
      { transaction },
    );
    await recordOfferEvent(
      offer,
      "withdrawn",
      userId,
      "pending",
      "withdrawn",
      null,
      transaction,
    );
  });

  return buildOfferData(await loadOfferRow(id));
}

export async function counterOffer(
  userId: string,
  id: string,
  input: CounterOfferInput,
): Promise<{ offer: OfferData; countered_offer: OfferData }> {
  const createdId = await sequelize.transaction(async (transaction) => {
    const parent = await findOfferForUpdate(id, transaction);
    assertParticipant(parent, userId);
    await expireIfNeeded(parent, transaction);

    if ((parent.status ?? "pending") !== "pending") {
      throw serviceError(
        `Only pending offers can be countered. This offer is ${parent.status}.`,
        "INVALID_OPERATION",
      );
    }

    const context = await resolveCounterContext(
      parent,
      userId,
      input,
      transaction,
    );
    const rootOfferId = parent.root_offer_id ?? parent.id;
    await ensureThreadLimit(rootOfferId, transaction);

    const terms = buildTerms(context, input);
    const child = await Offer.create(
      {
        offer_number: buildOfferNumber(),
        listing_id: parent.listing_id ?? null,
        buyer_request_id: parent.buyer_request_id ?? null,
        conversation_id: parent.conversation_id ?? null,
        buyer_id: parent.buyer_id,
        farmer_id: parent.farmer_id,
        created_by: userId,
        parent_offer_id: parent.id,
        root_offer_id: rootOfferId,
        quantity: terms.quantity as unknown as number,
        unit: context.unit,
        unit_price: terms.unitPrice as unknown as number,
        total_amount: terms.totalAmount as unknown as number,
        currency: context.currency,
        delivery_terms: input.delivery_terms ?? null,
        delivery_location: input.delivery_location ?? null,
        delivery_date: input.delivery_date ?? null,
        buyer_message: input.buyer_message ?? null,
        status: "pending",
        expires_at: terms.expiresAt,
      },
      { transaction },
    );

    await parent.update(
      { status: "countered", countered_at: new Date() },
      { transaction },
    );
    await recordOfferEvent(
      parent,
      "countered",
      userId,
      "pending",
      "countered",
      { counter_offer_id: child.id },
      transaction,
    );
    await recordOfferEvent(
      child,
      "created",
      userId,
      null,
      "pending",
      { parent_offer_id: parent.id },
      transaction,
    );

    return child.id;
  });

  const child = buildOfferData(await loadOfferRow(createdId));
  const parent = buildOfferData(await loadOfferRow(id));
  return { offer: child, countered_offer: parent };
}
