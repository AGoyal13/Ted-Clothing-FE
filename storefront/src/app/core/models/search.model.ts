import { Product } from './product.model';

export interface SearchHit {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  gender: string | null;
  brand: string | null;
  basePrice: number;
  discountPercent: number;
  createdAt: number;
  // Rich arrays for PLP rendering — mirrors enriched SearchDocument
  colors: Array<{
    id: string;
    colorName: string;
    colorHex: string;
    firstImage: string | null;
  }>;
  skus: Array<{
    id: string;
    colorId: string;
    sizeLabel: string;
    stockQty: number;
  }>;
}

export interface SearchResponse {
  hits: SearchHit[];
  estimatedTotalHits: number;
  facetDistribution: Record<string, Record<string, number>> | null;
  facetStats: Record<string, { min: number; max: number }> | null;
  page: number;
  totalPages: number;
}

export interface FacetsResponse {
  sizes: Record<string, number>;
  colorNames: Record<string, number>;
  brand: Record<string, number>;
  priceRange: { min: number; max: number } | null;
}

/** Maps a Meilisearch hit to the Product shape expected by ProductCardComponent. */
export function searchHitToProduct(hit: SearchHit): Product {
  return {
    id:              hit.id,
    title:           hit.title,
    slug:            hit.slug,
    basePrice:       String(hit.basePrice),       // Product.basePrice is string (Prisma Decimal)
    discountPercent: String(hit.discountPercent), // same
    gender:          (hit.gender ?? 'UNISEX') as Product['gender'],
    status:          'ACTIVE',
    category: {
      id:        '',   // not used on PLP
      name:      hit.categoryName,
      slug:      hit.categorySlug,
      parent:    null,
      sizeGuide: null,
    },
    colors: hit.colors.map(c => ({
      id:        c.id,
      colorName: c.colorName,
      colorHex:  c.colorHex,
      images:    c.firstImage ? [c.firstImage] : [], // PLP only needs images[0]
    })),
    skus: hit.skus.map(s => ({
      id:        s.id,
      colorId:   s.colorId,
      sizeLabel: s.sizeLabel,
      stockQty:  s.stockQty,
    })),
    createdAt: new Date(hit.createdAt).toISOString(), // unix ms → ISO string for isNewArrival()
  };
}
