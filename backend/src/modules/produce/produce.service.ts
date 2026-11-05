import {
  ProduceCategory,
  ProduceType,
} from "../../database/models/index.js";
import type { ProduceCategoryData, ProduceTypeData } from "./produce.types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCategoryData(row: ProduceCategory): ProduceCategoryData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    is_active: row.is_active ?? true,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildTypeData(
  row: ProduceType & { category?: ProduceCategory },
): ProduceTypeData {
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    image_url: row.image_url ?? null,
    is_active: row.is_active ?? true,
    category: row.category ? buildCategoryData(row.category) : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Return all active produce categories ordered by name.
 */
export async function listCategories(): Promise<ProduceCategoryData[]> {
  const categories = await ProduceCategory.findAll({
    where: { is_active: true },
    order: [["name", "ASC"]],
  });
  return categories.map(buildCategoryData);
}

/**
 * Return active produce types, optionally filtered by category.
 * Each type includes its category data.
 */
export async function listTypes(filter?: {
  categoryId?: string;
  categorySlug?: string;
}): Promise<ProduceTypeData[]> {
  const whereClause: Record<string, unknown> = { is_active: true };

  if (filter?.categoryId) {
    whereClause.category_id = filter.categoryId;
  }

  const includeOptions: object[] = [
    {
      model: ProduceCategory,
      as: "category",
      attributes: ["id", "name", "slug", "description", "is_active", "created_at", "updated_at"],
      where: filter?.categorySlug
        ? { slug: filter.categorySlug, is_active: true }
        : { is_active: true },
    },
  ];

  const types = await ProduceType.findAll({
    where: whereClause,
    include: includeOptions,
    order: [["name", "ASC"]],
  });

  return types.map((t) =>
    buildTypeData(t as ProduceType & { category?: ProduceCategory }),
  );
}

/**
 * Return a single produce type by ID, with its category. Throws NOT_FOUND
 * if the type does not exist or is not active.
 */
export async function getTypeById(id: string): Promise<ProduceTypeData> {
  const type = await ProduceType.findOne({
    where: { id, is_active: true },
    include: [
      {
        model: ProduceCategory,
        as: "category",
        attributes: ["id", "name", "slug", "description", "is_active", "created_at", "updated_at"],
      },
    ],
  });

  if (!type) {
    throw Object.assign(new Error("Produce type not found."), { code: "NOT_FOUND" });
  }

  return buildTypeData(type as ProduceType & { category?: ProduceCategory });
}
