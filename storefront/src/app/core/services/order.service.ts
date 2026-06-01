import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  InitiateOrderResponse,
  Order,
  OrderListItem,
  RazorpayPaymentResponse,
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  initiateOrder(addressId: string): Observable<InitiateOrderResponse> {
    return this.api.post<InitiateOrderResponse>('/orders/initiate', { addressId });
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

  getMyOrders(): Observable<OrderListItem[]> {
    return this.api.get<OrderListItem[]>('/orders');
  }

  getOrderById(id: string): Observable<Order> {
    return this.api.get<Order>(`/orders/${id}`);
  }
}
