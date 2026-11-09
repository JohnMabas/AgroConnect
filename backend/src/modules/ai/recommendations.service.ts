import { Op } from "sequelize";
import {
  BuyerRequest,
  MarketInsight,
  ProduceListing,
  ProduceType,
  Recommendation,
} from "../../database/models/index.js";
import type { RecommendationType } from "../../database/models/recommendation.model.js";
import { requireAIFeature } from "./ai.config.service.js";
import { assertDailyUserLimit, recordAIUsage } from "./ai.usage.service.js";
import type {
  PaginatedRecommendations,
  RecommendationData,
} from "./ai.types.js";
import type {
  AdminGenerateRecommendationsInput,
  GenerateRecommendationsInput,
  RecommendationListQuery,
} from "./ai.validation.js";

interface RecommendationCandidate {
  recommendation_type: RecommendationType;
  title: string;
  summary: string;
  reason: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  score: number;
  expires_at: Date | null;
  metadata: Record<string, unknown> | null;
  dedupe_key: string;
}

type ListingRow = ProduceListing & {
  produce_type?: ProduceType;
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function endOfDate(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRecommendation(row: Recommendation): RecommendationData {
  return {
    id: row.id,
    user_id: row.user_id,
    recommendation_type: row.recommendation_type,
    title: row.title,
    summary: row.summary,
    reason: row.reason,
    related_entity_type: row.related_entity_type ?? null,
    related_entity_id: row.related_entity_id ?? null,
    score: numberValue(row.score),
    status: row.status ?? "active",
    expires_at: row.expires_at ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function keepBest(
  candidates: Map<string, RecommendationCandidate>,
  candidate: RecommendationCandidate,
): void {
  const existing = candidates.get(candidate.dedupe_key);
  if (!existing || candidate.score > existing.score) {
    candidates.set(candidate.dedupe_key, candidate);
  }
}

function locationMatches(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  return Boolean(
    left &&
      right &&
      left.localeCompare(right, undefined, { sensitivity: "base" }) === 0,
  );
}

async function buyerRequestCandidates(
  userId: string,
  requests: BuyerRequest[],
  candidates: Map<string, RecommendationCandidate>,
): Promise<void> {
  for (const request of requests) {
    const where: Record<string, unknown> = {
      status: "published",
      farmer_user_id: { [Op.ne]: userId },
      available_quantity: { [Op.gt]: 0 },
      unit: request.unit,
      currency: request.currency,
      [Op.or]: [
        { expiry_date: null },
        { expiry_date: { [Op.gte]: today() } },
      ],
    };

    const include = {
      model: ProduceType,
      as: "produce_type",
      attributes: ["id", "name", "category_id"],
      required: true,
      ...(request.produce_category_id && !request.produce_type_id
        ? { where: { category_id: request.produce_category_id } }
        : {}),
    };

    if (request.produce_type_id) {
      where["produce_type_id"] = request.produce_type_id;
    }

    const listings = (await ProduceListing.findAll({
      where,
      include: [include],
      order: [["created_at", "DESC"]],
      limit: 20,
    })) as ListingRow[];

    for (const listing of listings) {
      const available = numberValue(listing.available_quantity);
      const price = numberValue(listing.price_per_unit);
      const target = request.target_price_per_unit
        ? numberValue(request.target_price_per_unit)
        : null;
      const sameState = locationMatches(
        listing.state_or_region,
        request.state_or_region,
      );
      const withinTarget = target === null || price <= target;
      const quantityFits = available >= numberValue(request.requested_quantity);

      let score = 55;
      if (sameState) score += 15;
      if (withinTarget) score += 15;
      if (quantityFits) score += 10;
      score += Math.min(5, available / Math.max(1, numberValue(request.requested_quantity)));

      const produceName = listing.produce_type?.name ?? "Produce";
      const location =
        listing.local_government_area ??
        listing.state_or_region ??
        listing.country ??
        "the marketplace";
      keepBest(candidates, {
        recommendation_type: "listing",
        title: `${produceName} available in ${location}`,
        summary: `${listing.title} — ${available} ${listing.unit} at ${price.toFixed(
          2,
        )} ${listing.currency} per ${listing.unit}.`,
        reason: [
          `Matches your open request for ${request.requested_quantity} ${request.unit}.`,
          sameState ? "Located in your preferred region." : "",
          withinTarget
            ? target !== null
              ? `Asking price is within your target of ${target.toFixed(2)} ${request.currency}.`
              : ""
            : `Asking price is above your target${target !== null ? ` of ${target.toFixed(2)} ${request.currency}` : ""}.`,
          quantityFits ? "Available quantity covers your request." : "",
        ]
          .filter(Boolean)
          .join(" "),
        related_entity_type: "produce_listing",
        related_entity_id: listing.id,
        score: Math.min(100, score),
        expires_at: daysFromNow(7),
        metadata: {
          listing_id: listing.id,
          buyer_request_id: request.id,
          produce_type_id: listing.produce_type_id,
          produce_name: produceName,
          price_per_unit: price,
          currency: listing.currency,
          unit: listing.unit,
          available_quantity: available,
          state_or_region: listing.state_or_region ?? null,
          local_government_area: listing.local_government_area ?? null,
        },
        dedupe_key: `listing:${listing.id}`,
      });
    }
  }
}

async function sellerBuyerRequestCandidates(
  userId: string,
  listings: ListingRow[],
  candidates: Map<string, RecommendationCandidate>,
): Promise<void> {
  for (const listing of listings) {
    const produceCategoryId = listing.produce_type?.category_id;
    const matchingRequestWhere: Record<string, unknown> = {
      status: "open",
      buyer_user_id: { [Op.ne]: userId },
      expiry_date: { [Op.gte]: today() },
      unit: listing.unit,
      currency: listing.currency,
      [Op.or]: [
        { produce_type_id: listing.produce_type_id },
        ...(produceCategoryId
          ? [{ produce_category_id: produceCategoryId }]
          : []),
      ],
    };

    const requests = await BuyerRequest.findAll({
      where: matchingRequestWhere,
      include: [
        {
          model: ProduceType,
          as: "produce_type",
          attributes: ["id", "name"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    for (const request of requests) {
      const requested = numberValue(request.requested_quantity);
      const available = numberValue(listing.available_quantity);
      const price = numberValue(listing.price_per_unit);
      const target = request.target_price_per_unit
        ? numberValue(request.target_price_per_unit)
        : null;
      const sameState = locationMatches(
        listing.state_or_region,
        request.state_or_region,
      );
      const targetSupportsPrice = target === null || target >= price;
      const quantityFits = available >= requested;

      let score = 55;
      if (sameState) score += 15;
      if (targetSupportsPrice) score += 15;
      if (quantityFits) score += 15;
      score += Math.min(5, requested / Math.max(1, available));

      const produceName =
        listing.produce_type?.name ?? "Produce";
      keepBest(candidates, {
        recommendation_type: "buyer_request",
        title: `Buyer looking for ${produceName}`,
        summary: `Open request for ${requested} ${request.unit}${
          target !== null
            ? ` with a target price of ${target.toFixed(2)} ${request.currency} per ${request.unit}`
            : ""
        }.`,
        reason: [
          `Matches your listing "${listing.title}".`,
          sameState ? "Buyer is looking in your region." : "",
          targetSupportsPrice
            ? "Buyer's target price supports your asking price."
            : "Buyer's target price is below your asking price.",
          quantityFits
            ? "Your available quantity covers the full request."
            : "Your available quantity could cover part of this request.",
        ]
          .filter(Boolean)
          .join(" "),
        related_entity_type: "buyer_request",
        related_entity_id: request.id,
        score: Math.min(100, score),
        expires_at: endOfDate(request.expiry_date),
        metadata: {
          buyer_request_id: request.id,
          listing_id: listing.id,
          produce_type_id:
            request.produce_type_id ?? listing.produce_type_id,
          produce_name: produceName,
          requested_quantity: requested,
          target_price_per_unit: target,
          currency: request.currency,
          unit: request.unit,
          state_or_region: request.state_or_region ?? null,
          local_government_area: request.local_government_area ?? null,
        },
        dedupe_key: `buyer_request:${request.id}`,
      });
    }
  }
}

function insightCandidates(
  userId: string,
  insights: MarketInsight[],
  listings: ListingRow[],
  requests: BuyerRequest[],
  candidates: Map<string, RecommendationCandidate>,
): void {
  const userProduceIds = new Set<string>([
    ...listings.map((listing) => listing.produce_type_id),
    ...requests
      .map((request) => request.produce_type_id)
      .filter((id): id is string => Boolean(id)),
  ]);
  const userStates = new Set<string>(
    [...listings.map((listing) => listing.state_or_region), ...requests.map(
      (request) => request.state_or_region,
    )]
      .filter((state): state is string => Boolean(state))
      .map((state) => state.toLowerCase()),
  );

  const sellerInsightTypes = new Set([
    "price_increase",
    "supply_shortage",
    "demand_increase",
  ]);
  const buyerInsightTypes = new Set([
    "price_decrease",
    "supply_surplus",
    "demand_decrease",
  ]);
  const hasSellerActivity = listings.length > 0;
  const hasBuyerActivity = requests.length > 0;

  for (const insight of insights) {
    const isSellerInsight = sellerInsightTypes.has(insight.insight_type);
    const isBuyerInsight = buyerInsightTypes.has(insight.insight_type);
    if (hasSellerActivity && !hasBuyerActivity && !isSellerInsight) continue;
    if (hasBuyerActivity && !hasSellerActivity && !isBuyerInsight) continue;

    const produceMatches =
      insight.produce_type_id !== null &&
      insight.produce_type_id !== undefined &&
      userProduceIds.has(insight.produce_type_id);
    const regionMatches =
      insight.state_or_region !== null &&
      insight.state_or_region !== undefined &&
      userStates.has(insight.state_or_region.toLowerCase());

    if ((userProduceIds.size > 0 || userStates.size > 0) && !produceMatches && !regionMatches) {
      continue;
    }

    const severityScore =
      insight.severity === "high" ? 75 : insight.severity === "medium" ? 65 : 55;
    keepBest(candidates, {
      recommendation_type: "market_opportunity",
      title: insight.title,
      summary: insight.summary,
      reason: `Active ${insight.insight_type.replaceAll("_", " ")} signal${
        produceMatches ? " for produce you already trade" : ""
      }${regionMatches ? " in your region" : ""}.`,
      related_entity_type: "market_insight",
      related_entity_id: insight.id,
      score: severityScore,
      expires_at: insight.expires_at ?? daysFromNow(7),
      metadata: {
        insight_id: insight.id,
        insight_type: insight.insight_type,
        severity: insight.severity,
        produce_type_id: insight.produce_type_id ?? null,
        state_or_region: insight.state_or_region ?? null,
        period_start: insight.period_start,
        period_end: insight.period_end,
        user_id: userId,
      },
      dedupe_key: `insight:${insight.id}`,
    });
  }
}

async function persistCandidates(
  userId: string,
  candidates: RecommendationCandidate[],
): Promise<void> {
  const now = new Date();
  await Recommendation.update(
    { status: "expired" },
    {
      where: {
        user_id: userId,
        status: "active",
        expires_at: { [Op.lt]: now },
      },
    },
  );

  for (const candidate of candidates) {
    const existing = await Recommendation.findOne({
      where: { user_id: userId, dedupe_key: candidate.dedupe_key },
    });

    if (existing) {
      if (existing.status === "dismissed" || existing.status === "completed") {
        continue;
      }
      await existing.update({
        recommendation_type: candidate.recommendation_type,
        title: candidate.title,
        summary: candidate.summary,
        reason: candidate.reason,
        related_entity_type: candidate.related_entity_type,
        related_entity_id: candidate.related_entity_id,
        score: candidate.score,
        status: "active",
        expires_at: candidate.expires_at,
        metadata: candidate.metadata,
      });
      continue;
    }

    await Recommendation.create({
      user_id: userId,
      recommendation_type: candidate.recommendation_type,
      title: candidate.title,
      summary: candidate.summary,
      reason: candidate.reason,
      related_entity_type: candidate.related_entity_type,
      related_entity_id: candidate.related_entity_id,
      score: candidate.score,
      status: "active",
      expires_at: candidate.expires_at,
      metadata: candidate.metadata,
      dedupe_key: candidate.dedupe_key,
    });
  }
}

export async function generateRecommendations(
  userId: string,
  input: GenerateRecommendationsInput,
  options: { trackUsage?: boolean } = {},
): Promise<RecommendationData[]> {
  await requireAIFeature("recommendations_enabled");
  if (options.trackUsage !== false) {
    await assertDailyUserLimit(userId, "recommendations");
  }
  const startedAt = Date.now();

  try {
    const [listingsRaw, requests, insights] = await Promise.all([
      ProduceListing.findAll({
        where: {
          farmer_user_id: userId,
          status: "published",
          available_quantity: { [Op.gt]: 0 },
          [Op.or]: [
            { expiry_date: null },
            { expiry_date: { [Op.gte]: today() } },
          ],
        },
        include: [
          {
            model: ProduceType,
            as: "produce_type",
            attributes: ["id", "name", "category_id"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 25,
      }) as Promise<ListingRow[]>,
      BuyerRequest.findAll({
        where: {
          buyer_user_id: userId,
          status: "open",
          expiry_date: { [Op.gte]: today() },
        },
        order: [["created_at", "DESC"]],
        limit: 25,
      }),
      MarketInsight.findAll({
        where: {
          status: "active",
          [Op.or]: [
            { expires_at: null },
            { expires_at: { [Op.gt]: new Date() } },
          ],
        },
        order: [
          ["severity", "DESC"],
          ["generated_at", "DESC"],
        ],
        limit: 40,
      }),
    ]);

    const candidates = new Map<string, RecommendationCandidate>();
    if (requests.length > 0) {
      await buyerRequestCandidates(userId, requests, candidates);
    }
    if (listingsRaw.length > 0) {
      await sellerBuyerRequestCandidates(userId, listingsRaw, candidates);
    }
    insightCandidates(userId, insights, listingsRaw, requests, candidates);

    if (listingsRaw.length === 0 && requests.length === 0) {
      keepBest(candidates, {
        recommendation_type: "platform_action",
        title: "Start trading on AgroConnect",
        summary:
          "Publish a produce listing or create a buyer request so recommendations can be personalised to your activity.",
        reason:
          "Your account has no active listings or open buyer requests yet.",
        related_entity_type: null,
        related_entity_id: null,
        score: 50,
        expires_at: daysFromNow(30),
        metadata: null,
        dedupe_key: "platform:start_trading",
      });
    }

    const selected = [...candidates.values()]
      .sort((left, right) => right.score - left.score)
      .slice(0, input.limit);

    await persistCandidates(userId, selected);

    const saved =
      selected.length === 0
        ? []
        : await Recommendation.findAll({
            where: {
              user_id: userId,
              dedupe_key: {
                [Op.in]: selected.map((item) => item.dedupe_key),
              },
            },
            order: [["score", "DESC"]],
          });

    await recordAIUsage({
      user_id: userId,
      feature: "recommendations",
      status: "success",
      latency_ms: Date.now() - startedAt,
      metadata: {
        candidates: candidates.size,
        selected: selected.length,
        generated_at: new Date().toISOString(),
      },
    });

    return saved.map(mapRecommendation);
  } catch (error) {
    const code =
      error instanceof Error && "code" in error
        ? String((error as Error & { code?: string }).code)
        : "RECOMMENDATION_ERROR";
    await recordAIUsage({
      user_id: userId,
      feature: "recommendations",
      status: "error",
      latency_ms: Date.now() - startedAt,
      error_code: code,
    });
    throw error;
  }
}

export async function listRecommendations(
  userId: string,
  query: RecommendationListQuery,
): Promise<PaginatedRecommendations> {
  const where: Record<string, unknown> = { user_id: userId };
  if (query.type) where["recommendation_type"] = query.type;
  where["status"] = query.status ?? "active";

  const { rows, count } = await Recommendation.findAndCountAll({
    where,
    order: [
      ["score", "DESC"],
      ["created_at", "DESC"],
    ],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return {
    recommendations: rows.map(mapRecommendation),
    total: count,
    page: query.page,
    limit: query.limit,
    total_pages: Math.ceil(count / query.limit),
  };
}

export async function dismissRecommendation(
  userId: string,
  id: string,
): Promise<RecommendationData> {
  const row = await Recommendation.findOne({
    where: { id, user_id: userId },
  });
  if (!row) {
    throw serviceError("Recommendation not found.", "NOT_FOUND");
  }
  if (row.status === "dismissed") {
    return mapRecommendation(row);
  }
  await row.update({ status: "dismissed" });
  return mapRecommendation(row);
}

export async function completeRecommendation(
  userId: string,
  id: string,
): Promise<RecommendationData> {
  const row = await Recommendation.findOne({
    where: { id, user_id: userId },
  });
  if (!row) {
    throw serviceError("Recommendation not found.", "NOT_FOUND");
  }
  if (row.status === "completed") {
    return mapRecommendation(row);
  }
  await row.update({ status: "completed" });
  return mapRecommendation(row);
}

export async function adminGenerateRecommendations(
  adminUserId: string,
  input: AdminGenerateRecommendationsInput,
): Promise<{
  user_id: string;
  generated: number;
  recommendations: RecommendationData[];
}> {
  const targetUserId = input.user_id ?? adminUserId;
  const recommendations = await generateRecommendations(
    targetUserId,
    { limit: input.limit },
    { trackUsage: false },
  );
  return {
    user_id: targetUserId,
    generated: recommendations.length,
    recommendations,
  };
}
