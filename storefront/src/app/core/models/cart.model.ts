export interface CartItem {
  skuId: string;
  skuCode: string;
  productSlug: string;
  productTitle: string;
  colorName: string;
  sizeLabel: string;
  price: number;
  quantity: number;
  image: string | null;
}
