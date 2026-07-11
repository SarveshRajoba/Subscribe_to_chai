import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AuthResponse, CancelResult, MenuItem, Order, Plan, Review, Shop, ShopEarnings,
  ShopQuestion, ShopReviews, ShopSearchResult, Subscription, UserRole, Wallet
} from './models';
import { environment } from '../../environments/environment';

const API_BASE = environment.apiUrl;

export interface ShopUpsert {
  name: string;
  address: string;
  autoAcceptOrders: boolean;
  latitude?: number | null;
  longitude?: number | null;
  gstNumber?: string | null;
}

export interface OtpRequestResult {
  sent: boolean;
  // Present only in dev/demo so the flow is testable without a real SMS.
  demoCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(protected http: HttpClient) {}

  // ---- Auth ----
  login(email: string, password: string): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', { email, password });
  }
  register(name: string, email: string, password: string, role: UserRole): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', { name, email, password, role });
  }
  requestOtp(phoneNumber: string): Promise<OtpRequestResult> {
    return this.post<OtpRequestResult>('/auth/otp/request', { phoneNumber });
  }
  verifyOtp(phoneNumber: string, code: string, name?: string, role?: UserRole): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/otp/verify', { phoneNumber, code, name, role });
  }
  googleSignIn(idToken: string, name?: string, role?: UserRole): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/google', { idToken, name, role });
  }

  // ---- Shops (public) ----
  getShops(): Promise<Shop[]> {
    return this.get<Shop[]>('/shops');
  }
  getShop(id: number): Promise<Shop> {
    return this.get<Shop>(`/shops/${id}`);
  }
  searchShops(q: string, lat?: number, lng?: number): Promise<ShopSearchResult[]> {
    const params = new URLSearchParams({ q });
    if (lat != null && lng != null) {
      params.set('lat', String(lat));
      params.set('lng', String(lng));
    }
    return this.get<ShopSearchResult[]>(`/shops/search?${params.toString()}`);
  }

  // ---- Reviews & questions ----
  getReviews(shopId: number): Promise<ShopReviews> {
    return this.get<ShopReviews>(`/shops/${shopId}/reviews`);
  }
  addReview(shopId: number, rating: number, comment: string): Promise<Review> {
    return this.post<Review>(`/shops/${shopId}/reviews`, { rating, comment });
  }
  getQuestions(shopId: number): Promise<ShopQuestion[]> {
    return this.get<ShopQuestion[]>(`/shops/${shopId}/questions`);
  }
  askQuestion(shopId: number, body: string): Promise<ShopQuestion> {
    return this.post<ShopQuestion>(`/shops/${shopId}/questions`, { body });
  }
  answerQuestion(shopId: number, questionId: number, answer: string): Promise<ShopQuestion> {
    return this.post<ShopQuestion>(`/shops/${shopId}/questions/${questionId}/answer`, { answer });
  }

  // ---- Owner: shop management ----
  getMyShops(): Promise<Shop[]> {
    return this.get<Shop[]>('/shops/mine');
  }
  createShop(body: ShopUpsert): Promise<Shop> {
    return this.post<Shop>('/shops', body);
  }
  updateShop(id: number, body: ShopUpsert): Promise<Shop> {
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

  protected get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${API_BASE}${path}`));
  }
  protected post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${API_BASE}${path}`, body));
  }
  protected put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${API_BASE}${path}`, body));
  }
}
