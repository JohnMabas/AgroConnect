export interface ProduceCategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProduceTypeData {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  category?: ProduceCategoryData;
  created_at: Date;
  updated_at: Date;
}
