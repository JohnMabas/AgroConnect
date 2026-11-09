import { Op, col, fn, type WhereOptions } from "sequelize";
import { env } from "../../config/env.js";
import {
  AgriculturalKnowledge,
  User,
} from "../../database/models/index.js";
import type { KnowledgeApprovalStatus } from "../../database/models/agricultural-knowledge.model.js";
import { cleanOptionalSingleLine, cleanOptionalText } from "../../utils/plain-text.js";
import { detectKnowledgeSafetyFlags, sanitizeKnowledgeText } from "./ai.safety.js";
import type {
  KnowledgeReferenceData,
  PaginatedKnowledge,
} from "./ai.types.js";
import type {
  AdminKnowledgeListQuery,
  CreateKnowledgeInput,
  SearchKnowledgeQuery,
  UpdateKnowledgeInput,
} from "./ai.validation.js";

type KnowledgeRow = AgriculturalKnowledge & {
  created_by?: User;
  approved_by?: User;
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

function mapKnowledge(row: KnowledgeRow): KnowledgeReferenceData {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    crop: row.crop ?? null,
    region: row.region ?? null,
    summary: row.summary ?? null,
    source_name: row.source_name ?? null,
    source_url: row.source_url ?? null,
    publication_date: row.publication_date ?? null,
    review_date: row.review_date ?? null,
    approval_status: row.approval_status ?? "pending",
    safety_flags: Array.isArray(row.safety_flags) ? row.safety_flags : [],
    created_by_user_id: row.created_by_user_id,
    approved_by_user_id: row.approved_by_user_id ?? null,
    approved_at: row.approved_at ?? null,
    rejection_reason: row.rejection_reason ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

const knowledgeIncludes = [
  {
    model: User,
    as: "created_by",
    attributes: ["id", "display_name"],
  },
  {
    model: User,
    as: "approved_by",
    attributes: ["id", "display_name"],
  },
];

function searchTokens(value: string | undefined): string[] {
  if (!value) return [];
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "can",
    "do",
    "for",
    "how",
    "i",
    "in",
    "is",
    "me",
    "of",
    "on",
    "or",
    "please",
    "the",
    "to",
    "what",
    "when",
    "where",
    "with",
  ]);
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token)),
    ),
  ].slice(0, 6);
}

function buildApprovedSearchWhere(
  query: SearchKnowledgeQuery,
): WhereOptions<AgriculturalKnowledge> {
  const clauses: Record<string, unknown>[] = [
    { approval_status: "approved" },
  ];
  if (query.topic) {
    clauses.push({ topic: { [Op.iLike]: `%${query.topic}%` } });
  }
  if (query.crop) {
    clauses.push({ crop: { [Op.iLike]: `%${query.crop}%` } });
  }
  if (query.region) {
    clauses.push({ region: { [Op.iLike]: `%${query.region}%` } });
  }

  const tokens = searchTokens(query.q);
  for (const token of tokens) {
    clauses.push({
      [Op.or]: [
        { title: { [Op.iLike]: `%${token}%` } },
        { summary: { [Op.iLike]: `%${token}%` } },
        { content: { [Op.iLike]: `%${token}%` } },
        { topic: { [Op.iLike]: `%${token}%` } },
        { crop: { [Op.iLike]: `%${token}%` } },
        { region: { [Op.iLike]: `%${token}%` } },
      ],
    });
  }

  return { [Op.and]: clauses } as WhereOptions<AgriculturalKnowledge>;
}

export async function searchApprovedKnowledge(
  query: SearchKnowledgeQuery,
): Promise<KnowledgeReferenceData[]> {
  const rows = await AgriculturalKnowledge.findAll({
    where: buildApprovedSearchWhere(query),
    order: [["updated_at", "DESC"]],
    limit: Math.min(query.limit, env.AI_KNOWLEDGE_SEARCH_LIMIT),
  });
  return rows.map((row) => mapKnowledge(row as KnowledgeRow));
}

export async function listAdminKnowledge(
  query: AdminKnowledgeListQuery,
): Promise<PaginatedKnowledge> {
  const clauses: Record<string, unknown>[] = [];
  if (query.status) clauses.push({ approval_status: query.status });
  if (query.topic) {
    clauses.push({ topic: { [Op.iLike]: `%${query.topic}%` } });
  }
  if (query.crop) {
    clauses.push({ crop: { [Op.iLike]: `%${query.crop}%` } });
  }
  if (query.region) {
    clauses.push({ region: { [Op.iLike]: `%${query.region}%` } });
  }
  if (query.search) {
    clauses.push({
      [Op.or]: [
        { title: { [Op.iLike]: `%${query.search}%` } },
        { summary: { [Op.iLike]: `%${query.search}%` } },
        { content: { [Op.iLike]: `%${query.search}%` } },
      ],
    });
  }

  const { rows, count } = await AgriculturalKnowledge.findAndCountAll({
    where: clauses.length > 0 ? ({ [Op.and]: clauses } as WhereOptions) : {},
    include: knowledgeIncludes,
    order: [["created_at", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });

  return {
    knowledge: rows.map((row) => mapKnowledge(row as KnowledgeRow)),
    ...paginationMeta(count, query.page, query.limit),
  };
}

export async function getKnowledge(
  id: string,
): Promise<KnowledgeReferenceData> {
  const row = await AgriculturalKnowledge.findByPk(id, {
    include: knowledgeIncludes,
  });
  if (!row) {
    throw serviceError("Knowledge record not found.", "NOT_FOUND");
  }
  return mapKnowledge(row as KnowledgeRow);
}

export async function createKnowledge(
  adminUserId: string,
  input: CreateKnowledgeInput,
): Promise<KnowledgeReferenceData> {
  const title = cleanOptionalSingleLine(input.title) ?? input.title;
  const content = sanitizeKnowledgeText(input.content);
  const summary = cleanOptionalText(input.summary);
  if (content.length < 10) {
    throw serviceError("Knowledge content is too short.", "VALIDATION_ERROR");
  }

  const row = await AgriculturalKnowledge.create({
    title,
    summary,
    content,
    topic: cleanOptionalSingleLine(input.topic) ?? input.topic,
    crop: cleanOptionalSingleLine(input.crop),
    region: cleanOptionalSingleLine(input.region),
    tags: (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    source_name: cleanOptionalSingleLine(input.source_name),
    source_url: cleanOptionalSingleLine(input.source_url),
    publication_date: input.publication_date ?? null,
    review_date: input.review_date ?? null,
    approval_status: "pending",
    safety_flags: detectKnowledgeSafetyFlags(
      `${title}\n${summary ?? ""}\n${content}`,
    ),
    created_by_user_id: adminUserId,
    approved_by_user_id: null,
    approved_at: null,
    rejection_reason: null,
    metadata: input.metadata ?? null,
  });

  return getKnowledge(row.id);
}

export async function updateKnowledge(
  id: string,
  input: UpdateKnowledgeInput,
): Promise<KnowledgeReferenceData> {
  const row = await AgriculturalKnowledge.findByPk(id);
  if (!row) {
    throw serviceError("Knowledge record not found.", "NOT_FOUND");
  }

  const title = input.title !== undefined
    ? cleanOptionalSingleLine(input.title) ?? row.title
    : row.title;
  const content = input.content !== undefined
    ? sanitizeKnowledgeText(input.content)
    : row.content;
  const summary = input.summary !== undefined
    ? cleanOptionalText(input.summary)
    : row.summary;

  await row.update({
    ...(input.title !== undefined ? { title } : {}),
    ...(input.summary !== undefined ? { summary } : {}),
    ...(input.content !== undefined ? { content } : {}),
    ...(input.topic !== undefined
      ? { topic: cleanOptionalSingleLine(input.topic) ?? row.topic }
      : {}),
    ...(input.crop !== undefined
      ? { crop: cleanOptionalSingleLine(input.crop) }
      : {}),
    ...(input.region !== undefined
      ? { region: cleanOptionalSingleLine(input.region) }
      : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.source_name !== undefined
      ? { source_name: cleanOptionalSingleLine(input.source_name) }
      : {}),
    ...(input.source_url !== undefined
      ? { source_url: cleanOptionalSingleLine(input.source_url) }
      : {}),
    ...(input.publication_date !== undefined
      ? { publication_date: input.publication_date }
      : {}),
    ...(input.review_date !== undefined
      ? { review_date: input.review_date }
      : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    approval_status: "pending",
    safety_flags: detectKnowledgeSafetyFlags(
      `${title}\n${summary ?? ""}\n${content}`,
    ),
    approved_by_user_id: null,
    approved_at: null,
    rejection_reason: null,
  });

  return getKnowledge(row.id);
}

export async function approveKnowledge(
  adminUserId: string,
  id: string,
): Promise<KnowledgeReferenceData> {
  const row = await AgriculturalKnowledge.findByPk(id);
  if (!row) {
    throw serviceError("Knowledge record not found.", "NOT_FOUND");
  }
  if (row.approval_status === "approved") {
    throw serviceError("Knowledge record is already approved.", "CONFLICT");
  }
  if (Array.isArray(row.safety_flags) && row.safety_flags.length > 0) {
    throw serviceError(
      "Knowledge records flagged for unsafe instructions or sensitive-data requests cannot be approved.",
      "VALIDATION_ERROR",
    );
  }

  await row.update({
    approval_status: "approved" satisfies KnowledgeApprovalStatus,
    approved_by_user_id: adminUserId,
    approved_at: new Date(),
    rejection_reason: null,
  });
  return getKnowledge(row.id);
}

export async function rejectKnowledge(
  adminUserId: string,
  id: string,
  reason: string,
): Promise<KnowledgeReferenceData> {
  const row = await AgriculturalKnowledge.findByPk(id);
  if (!row) {
    throw serviceError("Knowledge record not found.", "NOT_FOUND");
  }
  if (row.approval_status !== "pending") {
    throw serviceError(
      "Only pending knowledge records can be rejected.",
      "CONFLICT",
    );
  }

  await row.update({
    approval_status: "rejected",
    approved_by_user_id: adminUserId,
    approved_at: new Date(),
    rejection_reason: cleanOptionalText(reason) ?? reason,
  });
  return getKnowledge(row.id);
}

export async function archiveKnowledge(
  id: string,
): Promise<KnowledgeReferenceData> {
  const row = await AgriculturalKnowledge.findByPk(id);
  if (!row) {
    throw serviceError("Knowledge record not found.", "NOT_FOUND");
  }
  if (row.approval_status === "archived") {
    throw serviceError("Knowledge record is already archived.", "CONFLICT");
  }

  await row.update({ approval_status: "archived" });
  return getKnowledge(row.id);
}

export async function getKnowledgeCounts(): Promise<
  Record<KnowledgeApprovalStatus, number>
> {
  const rows = (await AgriculturalKnowledge.findAll({
    attributes: [
      "approval_status",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["approval_status"],
    raw: true,
  })) as unknown as Array<Record<string, unknown>>;

  const counts: Record<KnowledgeApprovalStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  };
  for (const row of rows) {
    const status = String(row["approval_status"]) as KnowledgeApprovalStatus;
    counts[status] = Number(row["count"]);
  }
  return counts;
}
