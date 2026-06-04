import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  InitiateOrderResponse,
  Order,
  OrderListItem,
  RazorpayPaymentResponse,
  ShippingRate,
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  initiateOrder(addressId: string, shippingCharge?: number): Observable<InitiateOrderResponse> {
    return this.api.post<InitiateOrderResponse>('/orders/initiate', { addressId, shippingCharge });
  }

  verifyPayment(
    addressId: string,
    payment: RazorpayPaymentResponse,
  ): Observable<Order> {
    return this.api.post<Order>('/orders/verify', {
      addressId,
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpaySignature: payment.razorpay_signature,
    });
  }

  getShippingRate(pincode: string, cod: boolean): Observable<ShippingRate> {
    return this.api.get<ShippingRate>(`/shipping/rate?pincode=${pincode}&cod=${cod}`);
  }

  initiateCodOrder(addressId: string, shippingCharge: number, codCharge: number, etdDays: number): Observable<Order> {
    return this.api.post<Order>('/orders/initiate-cod', { addressId, shippingCharge, codCharge, etdDays });
  }

  getMyOrders(): Observable<OrderListItem[]> {
    return this.api.get<OrderListItem[]>('/orders');
  }

  getOrderById(id: string): Observable<Order> {
    return this.api.get<Order>(`/orders/${id}`);
  }
}
