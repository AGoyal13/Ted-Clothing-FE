export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  gender: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX' | null;
  children?: Category[];
}

export interface NavTree {
  gender: 'MEN' | 'WOMEN' | 'KIDS';
  categories: Category[];
}

export interface CategoriesResponse {
  items: Category[];
  total: number;
}
