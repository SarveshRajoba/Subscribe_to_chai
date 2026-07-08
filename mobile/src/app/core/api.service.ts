import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  CancelResult, LedgerEntry, MenuItem, Order, Plan, Shop, ShopEarnings,
  Subscription, Wallet
} from './models';

// Local dev API. On a phone/emulator, replace localhost with your machine's
// LAN IP (e.g. http://192.168.1.5:5238/api).
export const API_BASE = 'http://localhost:5238/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ---- Shops (public) ----
  getShops(): Promise<Shop[]> {
    return this.get<Shop[]>('/shops');
  }
  getShop(id: number): Promise<Shop> {
    return this.get<Shop>(`/shops/${id}`);
  }

  // ---- Owner: shop management ----
  getMyShops(): Promise<Shop[]> {
    return this.get<Shop[]>('/shops/mine');
  }
  createShop(body: { name: string; address: string; autoAcceptOrders: boolean }): Promise<Shop> {
    return this.post<Shop>('/shops', body);
  }
  updateShop(id: number, body: { name: string; address: string; autoAcceptOrders: boolean }): Promise<Shop> {
    return this.put<Shop>(`/shops/${id}`, body);
  }
  addMenuItem(shopId: number, body: { name: string; price: number; isAvailable: boolean }): Promise<MenuItem> {
    return this.post<MenuItem>(`/shops/${shopId}/menu`, body);
  }
  addPlan(shopId: number, body: {
    name: string; menuItemId: number; price: number; cupCount: number;
    validityDays: number; cancellationFeePercent: number; isActive: boolean;
  }): Promise<Plan> {
    return this.post<Plan>(`/shops/${shopId}/plans`, body);
  }
  getEarnings(shopId: number): Promise<ShopEarnings> {
    return this.get<ShopEarnings>(`/shops/${shopId}/earnings`);
  }

  // ---- Customer: subscriptions ----
  getMySubscriptions(): Promise<Subscription[]> {
    return this.get<Subscription[]>('/subscriptions/mine');
  }
  subscribe(planId: number, useWallet: boolean): Promise<Subscription> {
    return this.post<Subscription>('/subscriptions', { planId, useWallet });
  }
  cancelSubscription(id: number): Promise<CancelResult> {
    return this.post<CancelResult>(`/subscriptions/${id}/cancel`, {});
  }

  // ---- Orders ----
  placeOrder(subscriptionId: number, quantity: number): Promise<Order> {
    return this.post<Order>('/orders', { subscriptionId, quantity });
  }
  getMyOrders(): Promise<Order[]> {
    return this.get<Order[]>('/orders/mine');
  }
  getIncomingOrders(shopId: number): Promise<Order[]> {
    return this.get<Order[]>(`/orders/incoming/${shopId}`);
  }
  acceptOrder(id: number): Promise<Order> {
    return this.post<Order>(`/orders/${id}/accept`, {});
  }
  rejectOrder(id: number): Promise<Order> {
    return this.post<Order>(`/orders/${id}/reject`, {});
  }
  deliverOrder(id: number): Promise<Order> {
    return this.post<Order>(`/orders/${id}/deliver`, {});
  }

  // ---- Wallet ----
  getWallet(): Promise<Wallet> {
    return this.get<Wallet>('/wallet');
  }

  private get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${API_BASE}${path}`));
  }
  private post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${API_BASE}${path}`, body));
  }
  private put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${API_BASE}${path}`, body));
  }
}
