export interface SizeGuideMeasurement {
  key: string;
  label: string;
  howTo: string;
}

export interface SizeGuideRow {
  size: string;
  values: Record<string, string>;
}

export interface SizeGuide {
  id: string;
  name: string;
  measurements: SizeGuideMeasurement[];
  rows: SizeGuideRow[];
  fitTip: string | null;
}

export interface ProductColor {
  id: string;
  colorName: string;
  colorHex: string | null;
  images: string[];
}

export interface ProductSku {
  id: string;
  colorId: string;
  sizeLabel: string;
  skuCode: string;
  stockQty: number;
  priceOverride: string | null;
  attributes: Record<string, unknown>;
  measurements: Record<string, unknown>;
}

export interface ProductSkuList {
  id: string;
  colorId: string;
  sizeLabel: string;
  stockQty: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent: { id: string; slug: string } | null;
  sizeGuide: SizeGuide | null;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  basePrice: string;
  discountPercent: string;
  gender: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  category: ProductCategory;
  colors: ProductColor[];
  skus: ProductSkuList[];
  createdAt?: string;
}

export interface ProductDetail extends Omit<Product, 'skus'> {
  description: string;
  skus: ProductSku[];
  sizeGuide: SizeGuide | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: null | string;
}

/** Returns effective price after applying discount */
export function getEffectivePrice(product: Product | ProductDetail): number {
  const base = parseFloat(product.basePrice);
  const discount = parseFloat(product.discountPercent ?? '0');
  if (discount > 0) {
    return Math.round(base * (1 - discount / 100));
  }
  return Math.round(base);
}

/** Returns original base price as number */
export function getBasePrice(product: Product | ProductDetail): number {
  return Math.round(parseFloat(product.basePrice));
}

/** Formats a number as Indian Rupee string e.g. ₹6,490 */
export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

/** Returns first image URL from first color, or null */
export function getFirstImage(product: Product | ProductDetail): string | null {
  if (!product.colors || product.colors.length === 0) return null;
  const firstColor = product.colors[0];
  if (!firstColor.images || firstColor.images.length === 0) return null;
  return firstColor.images[0];
}

/** Returns images for a given colorId, or first color's images */
export function getImagesForColor(product: Product | ProductDetail, colorId?: string): string[] {
  if (!product.colors || product.colors.length === 0) return [];
  if (colorId) {
    const color = product.colors.find(c => c.id === colorId);
    if (color) return color.images ?? [];
  }
  return product.colors[0].images ?? [];
}

/** Checks if a product (or a specific color) is in stock */
export function isInStock(product: Product | ProductDetail, colorId?: string): boolean {
  if (!product.skus || product.skus.length === 0) return false;
  if (colorId) {
    return product.skus.some(s => s.colorId === colorId && s.stockQty > 0);
  }
  return product.skus.some(s => s.stockQty > 0);
}

/** Checks if discount is applicable */
export function hasDiscount(product: Product | ProductDetail): boolean {
  return parseFloat(product.discountPercent ?? '0') > 0;
}

/** Returns true if product was created within last 30 days */
export function isNewArrival(product: Product): boolean {
  if (!product.createdAt) return false;
  const created = new Date(product.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return created > thirtyDaysAgo;
}
