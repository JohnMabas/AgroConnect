import { Op, col, fn } from "sequelize";
import { env } from "../../config/env.js";
import { AIUsageLog } from "../../database/models/index.js";
import type {
  AIUsageFeature,
  AIUsageStatus,
} from "../../database/models/ai-usage-log.model.js";
import type {
  AIUsageGroup,
  PaginatedAIUsage,
  AIUsageData,
} from "./ai.types.js";
import type { AIUsageQuery } from "./ai.validation.js";

export interface RecordAIUsageInput {
  user_id: string;
  feature: AIUsageFeature;
  provider?: string | null;
  model?: string | null;
  status: AIUsageStatus;
  request_tokens?: number;
  response_tokens?: number;
  total_tokens?: number;
  latency_ms?: number | null;
  error_code?: string | null;
  metadata?: Record<string, unknown> | null;
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export async function assertDailyUserLimit(
  userId: string,
  feature: AIUsageFeature,
): Promise<void> {
  const count = await AIUsageLog.count({
    where: {
      user_id: userId,
      feature,
      created_at: { [Op.gte]: startOfUtcDay() },
    },
  });

  if (count >= env.AI_DAILY_USER_LIMIT) {
    throw Object.assign(
      new Error(
        `Daily AI usage limit reached. Try again after the UTC day resets.`,
      ),
      { code: "DAILY_LIMIT_REACHED" },
    );
  }
}

export async function recordAIUsage(
  input: RecordAIUsageInput,
): Promise<void> {
  const requestTokens = Math.max(0, Math.floor(input.request_tokens ?? 0));
  const responseTokens = Math.max(0, Math.floor(input.response_tokens ?? 0));
  await AIUsageLog.create({
    user_id: input.user_id,
    feature: input.feature,
    provider: input.provider ?? null,
    model: input.model ?? null,
    status: input.status,
    request_tokens: requestTokens,
    response_tokens: responseTokens,
    total_tokens: Math.max(
      0,
      Math.floor(input.total_tokens ?? requestTokens + responseTokens),
    ),
    latency_ms:
      input.latency_ms === undefined || input.latency_ms === null
        ? null
        : Math.max(0, Math.floor(input.latency_ms)),
    error_code: input.error_code ?? null,
    metadata: input.metadata ?? null,
  });
}

function buildUsageWhere(query: AIUsageQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (query.user_id) where["user_id"] = query.user_id;
  if (query.feature) where["feature"] = query.feature;
  if (query.status) where["status"] = query.status;
  if (query.date_from || query.date_to) {
    where["created_at"] = {
      ...(query.date_from
        ? { [Op.gte]: new Date(`${query.date_from}T00:00:00.000Z`) }
        : {}),
      ...(query.date_to
        ? { [Op.lt]: new Date(`${query.date_to}T23:59:59.999Z`) }
        : {}),
    };
  }
  return where;
}

function mapUsage(row: AIUsageLog): AIUsageData {
  return {
    id: row.id,
    user_id: row.user_id,
    feature: row.feature,
    provider: row.provider ?? null,
    model: row.model ?? null,
    status: row.status,
    request_tokens: Number(row.request_tokens),
    response_tokens: Number(row.response_tokens),
    total_tokens: Number(row.total_tokens),
    latency_ms: row.latency_ms === null ? null : Number(row.latency_ms),
    error_code: row.error_code ?? null,
    created_at: row.created_at!,
  };
}

export async function listAIUsage(
  query: AIUsageQuery,
): Promise<PaginatedAIUsage> {
  const where = buildUsageWhere(query);
  const { rows, count } = await AIUsageLog.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  const grouped = (await AIUsageLog.findAll({
    where,
    attributes: [
      "feature",
      "status",
      [fn("COUNT", col("id")), "request_count"],
      [fn("SUM", col("total_tokens")), "total_tokens"],
      [fn("AVG", col("latency_ms")), "average_latency_ms"],
    ],
    group: ["feature", "status"],
    raw: true,
  })) as unknown as Array<Record<string, unknown>>;

  const summary: AIUsageGroup[] = grouped.map((row) => ({
    feature: String(row["feature"]),
    status: String(row["status"]),
    request_count: Number(row["request_count"]),
    total_tokens: Number(row["total_tokens"] ?? 0),
    average_latency_ms: Math.round(Number(row["average_latency_ms"] ?? 0)),
  }));

  return {
    usage: rows.map(mapUsage),
    summary,
    total: count,
    page: query.page,
    limit: query.limit,
    total_pages: Math.ceil(count / query.limit),
  };
}

export async function getAIUsageTotalsSince(since: Date): Promise<{
  requests: number;
  errors: number;
  fallbacks: number;
  blocked: number;
  total_tokens: number;
}> {
  const where = { created_at: { [Op.gte]: since } };
  const [requests, errors, fallbacks, blocked, tokens] = await Promise.all([
    AIUsageLog.count({ where }),
    AIUsageLog.count({ where: { ...where, status: "error" } }),
    AIUsageLog.count({ where: { ...where, status: "fallback" } }),
    AIUsageLog.count({ where: { ...where, status: "blocked" } }),
    AIUsageLog.sum("total_tokens", { where }),
  ]);

  return {
    requests,
    errors,
    fallbacks,
    blocked,
    total_tokens: Number(tokens ?? 0),
  };
}
