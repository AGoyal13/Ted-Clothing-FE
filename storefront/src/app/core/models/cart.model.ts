export interface CartItem {
  skuId: string;
  skuCode: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  colorName: string;
  sizeLabel: string;
  price: number;        // effective price after discount
  basePrice: number;    // original base price (for strikethrough)
  discountPct: number;  // 0 means no discount
  quantity: number;
  stockQty: number;     // current stock — caps the + button
  image: string | null;
}

export interface CartSummary {
  subtotal: number;
  itemCount: number;
  shippingCharge: number;
  freeShippingThreshold: number;
  total: number;
}

export interface CartApiResponse {
  items: CartItem[];
  oosItems: CartItem[];
  summary: CartSummary;
}
