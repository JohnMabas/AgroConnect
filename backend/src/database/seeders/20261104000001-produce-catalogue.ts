import type { QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

const CATEGORIES = [
  { name: "Grains and Cereals", slug: "grains-and-cereals" },
  { name: "Vegetables", slug: "vegetables" },
  { name: "Fruits", slug: "fruits" },
  { name: "Tubers and Roots", slug: "tubers-and-roots" },
  { name: "Legumes and Pulses", slug: "legumes-and-pulses" },
  { name: "Livestock and Animal Products", slug: "livestock-and-animal-products" },
  { name: "Oilseeds", slug: "oilseeds" },
  { name: "Other Agricultural Products", slug: "other-agricultural-products" },
] as const;

const PRODUCE_TYPES: Array<{ name: string; slug: string; categorySlug: string }> = [
  // Grains and Cereals
  { name: "Maize", slug: "maize", categorySlug: "grains-and-cereals" },
  { name: "Rice", slug: "rice", categorySlug: "grains-and-cereals" },
  { name: "Millet", slug: "millet", categorySlug: "grains-and-cereals" },
  { name: "Sorghum", slug: "sorghum", categorySlug: "grains-and-cereals" },
  { name: "Wheat", slug: "wheat", categorySlug: "grains-and-cereals" },
  // Vegetables
  { name: "Tomatoes", slug: "tomatoes", categorySlug: "vegetables" },
  { name: "Onions", slug: "onions", categorySlug: "vegetables" },
  { name: "Pepper", slug: "pepper", categorySlug: "vegetables" },
  { name: "Cabbage", slug: "cabbage", categorySlug: "vegetables" },
  { name: "Carrot", slug: "carrot", categorySlug: "vegetables" },
  // Fruits
  { name: "Plantain", slug: "plantain", categorySlug: "fruits" },
  { name: "Banana", slug: "banana", categorySlug: "fruits" },
  { name: "Mango", slug: "mango", categorySlug: "fruits" },
  { name: "Orange", slug: "orange", categorySlug: "fruits" },
  { name: "Pineapple", slug: "pineapple", categorySlug: "fruits" },
  // Tubers and Roots
  { name: "Yam", slug: "yam", categorySlug: "tubers-and-roots" },
  { name: "Cassava", slug: "cassava", categorySlug: "tubers-and-roots" },
  { name: "Irish Potatoes", slug: "irish-potatoes", categorySlug: "tubers-and-roots" },
  { name: "Sweet Potatoes", slug: "sweet-potatoes", categorySlug: "tubers-and-roots" },
  { name: "Cocoyam", slug: "cocoyam", categorySlug: "tubers-and-roots" },
  // Legumes and Pulses
  { name: "Beans", slug: "beans", categorySlug: "legumes-and-pulses" },
  { name: "Soybeans", slug: "soybeans", categorySlug: "legumes-and-pulses" },
  { name: "Groundnuts", slug: "groundnuts", categorySlug: "legumes-and-pulses" },
  { name: "Cowpea", slug: "cowpea", categorySlug: "legumes-and-pulses" },
  // Livestock and Animal Products
  { name: "Chicken", slug: "chicken", categorySlug: "livestock-and-animal-products" },
  { name: "Eggs", slug: "eggs", categorySlug: "livestock-and-animal-products" },
  { name: "Goat Meat", slug: "goat-meat", categorySlug: "livestock-and-animal-products" },
  { name: "Fish", slug: "fish", categorySlug: "livestock-and-animal-products" },
  // Oilseeds
  { name: "Palm Oil", slug: "palm-oil", categorySlug: "oilseeds" },
  { name: "Sesame Seeds", slug: "sesame-seeds", categorySlug: "oilseeds" },
  { name: "Sunflower Seeds", slug: "sunflower-seeds", categorySlug: "oilseeds" },
  // Other Agricultural Products
  { name: "Ginger", slug: "ginger", categorySlug: "other-agricultural-products" },
  { name: "Turmeric", slug: "turmeric", categorySlug: "other-agricultural-products" },
  { name: "Garlic", slug: "garlic", categorySlug: "other-agricultural-products" },
];

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  // Insert categories — idempotent
  for (const category of CATEGORIES) {
    await queryInterface.sequelize.query(
      `INSERT INTO produce_categories (id, name, slug, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), :name, :slug, true, NOW(), NOW())
       ON CONFLICT (slug) DO NOTHING`,
      { replacements: { name: category.name, slug: category.slug } },
    );
  }

  // Insert produce types via subquery to resolve category FK — idempotent
  for (const pt of PRODUCE_TYPES) {
    await queryInterface.sequelize.query(
      `INSERT INTO produce_types (id, category_id, name, slug, is_active, created_at, updated_at)
       SELECT gen_random_uuid(), id, :name, :slug, true, NOW(), NOW()
       FROM produce_categories WHERE slug = :categorySlug
       ON CONFLICT (slug) DO NOTHING`,
      {
        replacements: {
          name: pt.name,
          slug: pt.slug,
          categorySlug: pt.categorySlug,
        },
      },
    );
  }
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  const typeSlugs = PRODUCE_TYPES.map((pt) => pt.slug);
  const categorySlugs = CATEGORIES.map((c) => c.slug);

  await queryInterface.sequelize.query(
    `DELETE FROM produce_types WHERE slug IN (:slugs)`,
    { replacements: { slugs: typeSlugs } },
  );

  await queryInterface.sequelize.query(
    `DELETE FROM produce_categories WHERE slug IN (:slugs)`,
    { replacements: { slugs: categorySlugs } },
  );
}
