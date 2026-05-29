export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  gender: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX' | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Category[];
}

export interface NavGroup {
  id: string;
  name: string;
  slug: string;
  categories: Array<{ id: string; name: string; slug: string; gender: string | null }>;
}

export type GenderNavTree = NavGroup[];

export interface CategoriesResponse {
  items: Category[];
  total: number;
}

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  children?: NavCategory[];
}

export type NavTree = NavCategory[];
