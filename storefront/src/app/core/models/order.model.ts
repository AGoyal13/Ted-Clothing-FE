export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'PREPAID' | 'COD';

export interface ShippingRate {
  charge: number;
  codCharge: number;
  etdDays: number;
  serviceable: boolean;
}

export interface OrderAddress {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItemSku {
  id: string;
  sizeLabel: string;
  skuCode: string;
  color: { id: string; colorName: string; colorHex: string; images: string[] };
  product: { id: string; title: string; slug: string; basePrice: string; discountPercent: string | null };
}

export interface OrderItem {
  id: string;
  quantity: number;
  priceAtPurchase: string;
  sku: OrderItemSku;
}

export interface Order {
  id: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  shippingCharge: string;
  codCharge: string;
  awb?: string;
  etdDays?: number;
  createdAt: string;
  deliveredAt?: string;
  items: OrderItem[];
  address: OrderAddress;
}

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  shippingCharge: string;
  createdAt: string;
  deliveredAt?: string;
  items: Array<{
    id: string;
    quantity: number;
    priceAtPurchase: string;
    sku: {
      sizeLabel: string;
      color: { colorName: string; images: string[] };
      product: { id: string; title: string; slug: string };
    };
  }>;
  _count: { items: number };
}

export interface InitiateOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  subtotal: number;
  shippingCharge: number;
  total: number;
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
