import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { storage } from './storage';
import {
  AuthResponse, CancelResult, MenuItem, Order, OrderStatus, Plan, Shop,
  ShopEarnings, Subscription, UserRole, Wallet
} from './models';

// Demo mode: mirrors the ChaiApi escrow rules against an in-browser store,
// so the deployed web app is fully clickable without a hosted backend.

interface DbUser { id: number; name: string; email: string; role: UserRole; walletBalance: number; }
interface DbShop { id: number; ownerId: number; name: string; address: string; autoAcceptOrders: boolean; payableBalance: number; }
interface DbMenuItem extends MenuItem { shopId: number; }
interface DbPlan { id: number; shopId: number; menuItemId: number; name: string; price: number; cupCount: number; validityDays: number; cancellationFeePercent: number; isActive: boolean; }
interface DbSubscription { id: number; userId: number; planId: number; shopId: number; startsAt: string; expiresAt: string; cupsTotal: number; cupsUsed: number; amountPaid: number; escrowRemaining: number; status: 'Active' | 'Cancelled' | 'Expired'; }
interface DbOrder { id: number; subscriptionId: number; userId: number; shopId: number; quantity: number; token: string; status: OrderStatus; createdAt: string; deliveredAt?: string; }
interface DbLedgerEntry { id: number; type: string; amount: number; userId?: number; shopId?: number; subscriptionId?: number; orderId?: number; description: string; createdAt: string; }

interface Db {
  seq: number;
  users: DbUser[];
  shops: DbShop[];
  menuItems: DbMenuItem[];
  plans: DbPlan[];
  subscriptions: DbSubscription[];
  orders: DbOrder[];
  ledger: DbLedgerEntry[];
}

const STORE_KEY = 'chai_demo_db';

function seed(): Db {
  return {
    seq: 100,
    users: [
      { id: 1, name: 'Ramesh (Demo Owner)', email: 'owner@demo.com', role: 'Owner', walletBalance: 0 },
      { id: 2, name: 'Lakshmi', email: 'lakshmi@demo.com', role: 'Owner', walletBalance: 0 },
    ],
    shops: [
      { id: 10, ownerId: 1, name: 'Ramesh Tea Stall', address: 'MG Road, Pune', autoAcceptOrders: false, payableBalance: 0 },
      { id: 11, ownerId: 2, name: 'Lakshmi Filter Coffee', address: 'FC Road, Pune', autoAcceptOrders: true, payableBalance: 0 },
    ],
    menuItems: [
      { id: 20, shopId: 10, name: 'Masala Chai', price: 15, isAvailable: true },
      { id: 21, shopId: 10, name: 'Adrak Chai', price: 18, isAvailable: true },
      { id: 22, shopId: 11, name: 'Filter Coffee', price: 25, isAvailable: true },
    ],
    plans: [
      { id: 30, shopId: 10, menuItemId: 20, name: 'Monthly 30 cups', price: 300, cupCount: 30, validityDays: 30, cancellationFeePercent: 10, isActive: true },
      { id: 31, shopId: 10, menuItemId: 21, name: 'Adrak 20 cups', price: 280, cupCount: 20, validityDays: 30, cancellationFeePercent: 10, isActive: true },
      { id: 32, shopId: 11, menuItemId: 22, name: 'Coffee 25 cups', price: 500, cupCount: 25, validityDays: 30, cancellationFeePercent: 5, isActive: true },
    ],
    subscriptions: [],
    orders: [],
    ledger: [],
  };
}

@Injectable()
export class MockApiService extends ApiService {
  private db: Db = this.loadDb();

  // ---- Auth ----

  override async login(email: string, _password: string): Promise<AuthResponse> {
    const user = this.db.users.find(u => u.email === email.trim().toLowerCase());
    if (!user) throw { error: 'No such account in this demo. Register first, or use owner@demo.com.' };
    return this.toAuth(user);
  }

  override async register(name: string, email: string, _password: string, role: UserRole): Promise<AuthResponse> {
    const normalized = email.trim().toLowerCase();
    if (!name.trim() || !normalized) throw { error: 'Name and email are required.' };
    if (this.db.users.some(u => u.email === normalized)) throw { error: 'An account with this email already exists.' };
    const user: DbUser = { id: this.nextId(), name: name.trim(), email: normalized, role, walletBalance: 0 };
    this.db.users.push(user);
    this.save();
    return this.toAuth(user);
  }

  // ---- Shops ----

  override async getShops(): Promise<Shop[]> {
    return this.db.shops.map(s => this.toShop(s));
  }

  override async getShop(id: number): Promise<Shop> {
    const shop = this.db.shops.find(s => s.id === id);
    if (!shop) throw { error: 'Shop not found.' };
    return this.toShop(shop);
  }

  override async getMyShops(): Promise<Shop[]> {
    return this.db.shops.filter(s => s.ownerId === this.currentUserId()).map(s => this.toShop(s));
  }

  override async createShop(body: { name: string; address: string; autoAcceptOrders: boolean }): Promise<Shop> {
    const shop: DbShop = {
      id: this.nextId(), ownerId: this.currentUserId(),
      name: body.name.trim(), address: body.address.trim(),
      autoAcceptOrders: body.autoAcceptOrders, payableBalance: 0
    };
    this.db.shops.push(shop);
    this.save();
    return this.toShop(shop);
  }

  override async updateShop(id: number, body: { name: string; address: string; autoAcceptOrders: boolean }): Promise<Shop> {
    const shop = this.ownedShop(id);
    shop.name = body.name.trim();
    shop.address = body.address.trim();
    shop.autoAcceptOrders = body.autoAcceptOrders;
    this.save();
    return this.toShop(shop);
  }

  override async addMenuItem(shopId: number, body: { name: string; price: number; isAvailable: boolean }): Promise<MenuItem> {
    this.ownedShop(shopId);
    const item: DbMenuItem = { id: this.nextId(), shopId, name: body.name.trim(), price: body.price, isAvailable: body.isAvailable };
    this.db.menuItems.push(item);
    this.save();
    return item;
  }

  override async addPlan(shopId: number, body: {
    name: string; menuItemId: number; price: number; cupCount: number;
    validityDays: number; cancellationFeePercent: number; isActive: boolean;
  }): Promise<Plan> {
    this.ownedShop(shopId);
    const menuItem = this.db.menuItems.find(m => m.id === body.menuItemId && m.shopId === shopId);
    if (!menuItem) throw { error: 'The plan must reference a menu item of this shop.' };
    if (body.cupCount <= 0 || body.price <= 0) throw { error: 'Price and cup count must be positive.' };
    if (body.cancellationFeePercent < 0 || body.cancellationFeePercent > 25) throw { error: 'Cancellation fee must be between 0% and 25%.' };
    const plan: DbPlan = { id: this.nextId(), shopId, ...body, name: body.name.trim() };
    this.db.plans.push(plan);
    this.save();
    return this.toPlan(plan);
  }

  override async getEarnings(shopId: number): Promise<ShopEarnings> {
    const shop = this.ownedShop(shopId);
    const entries = this.db.ledger
      .filter(e => e.shopId === shopId && (e.type === 'CupSettlement' || e.type === 'ConvenienceFee'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { payableBalance: shop.payableBalance, entries };
  }

  // ---- Subscriptions ----

  override async getMySubscriptions(): Promise<Subscription[]> {
    return this.db.subscriptions
      .filter(s => s.userId === this.currentUserId())
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .map(s => this.toSubscription(s));
  }

  override async subscribe(planId: number, useWallet: boolean): Promise<Subscription> {
    const plan = this.db.plans.find(p => p.id === planId && p.isActive);
    if (!plan) throw { error: 'Plan not found or inactive.' };
    const userId = this.currentUserId();
    if (this.db.subscriptions.some(s => s.userId === userId && s.planId === planId && s.status === 'Active'))
      throw { error: 'You already have an active subscription to this plan.' };

    const user = this.db.users.find(u => u.id === userId)!;
    const now = new Date();
    let walletApplied = 0;
    if (useWallet && user.walletBalance > 0) {
      walletApplied = Math.min(user.walletBalance, plan.price);
      user.walletBalance = this.round(user.walletBalance - walletApplied);
    }

    const sub: DbSubscription = {
      id: this.nextId(), userId, planId, shopId: plan.shopId,
      startsAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + plan.validityDays * 86400000).toISOString(),
      cupsTotal: plan.cupCount, cupsUsed: 0,
      amountPaid: plan.price, escrowRemaining: plan.price, status: 'Active'
    };
    this.db.subscriptions.push(sub);

    const shopName = this.db.shops.find(s => s.id === plan.shopId)!.name;
    if (walletApplied > 0) {
      this.addLedger('WalletDebit', walletApplied, { userId, subscriptionId: sub.id },
        `Wallet applied to '${plan.name}' at ${shopName}`);
    }
    this.addLedger('SubscriptionPayment', plan.price, { userId, shopId: plan.shopId, subscriptionId: sub.id },
      `Subscribed to '${plan.name}' at ${shopName}` + (walletApplied > 0 ? ` (₹${walletApplied} from wallet)` : ''));
    this.save();
    return this.toSubscription(sub);
  }

  override async cancelSubscription(id: number): Promise<CancelResult> {
    const sub = this.db.subscriptions.find(s => s.id === id && s.userId === this.currentUserId());
    if (!sub) throw { error: 'Subscription not found.' };
    if (sub.status !== 'Active') throw { error: 'Only active subscriptions can be cancelled.' };
    if (this.db.orders.some(o => o.subscriptionId === id && (o.status === 'Placed' || o.status === 'Accepted')))
      throw { error: 'You have pending orders on this subscription. Wait for them to complete first.' };

    const plan = this.db.plans.find(p => p.id === sub.planId)!;
    const shop = this.db.shops.find(s => s.id === sub.shopId)!;
    const remaining = sub.escrowRemaining;
    const fee = this.round(remaining * plan.cancellationFeePercent / 100);
    const refund = this.round(remaining - fee);

    sub.status = 'Cancelled';
    sub.escrowRemaining = 0;
    const user = this.db.users.find(u => u.id === sub.userId)!;
    user.walletBalance = this.round(user.walletBalance + refund);
    if (fee > 0) {
      shop.payableBalance = this.round(shop.payableBalance + fee);
      this.addLedger('ConvenienceFee', fee, { userId: user.id, shopId: shop.id, subscriptionId: sub.id },
        `Cancellation fee for '${plan.name}'`);
    }
    this.addLedger('WalletCredit', refund, { userId: user.id, shopId: shop.id, subscriptionId: sub.id },
      `Refund to wallet after cancelling '${plan.name}' at ${shop.name}`);
    this.save();
    return { convenienceFee: fee, refundedToWallet: refund };
  }

  // ---- Orders ----

  override async placeOrder(subscriptionId: number, quantity: number): Promise<Order> {
    if (quantity <= 0) throw { error: 'Quantity must be positive.' };
    const sub = this.db.subscriptions.find(s => s.id === subscriptionId && s.userId === this.currentUserId());
    if (!sub) throw { error: 'Subscription not found.' };
    if (sub.status !== 'Active') throw { error: 'This subscription is not active.' };
    if (new Date(sub.expiresAt) < new Date()) throw { error: 'This subscription has expired.' };
    const remaining = sub.cupsTotal - sub.cupsUsed;
    if (remaining < quantity) throw { error: `Only ${remaining} cups left on this subscription.` };

    sub.cupsUsed += quantity;
    const shop = this.db.shops.find(s => s.id === sub.shopId)!;
    const today = new Date().toISOString().slice(0, 10);
    const countToday = this.db.orders.filter(o => o.shopId === shop.id && o.createdAt.startsWith(today)).length;
    const order: DbOrder = {
      id: this.nextId(), subscriptionId, userId: sub.userId, shopId: shop.id,
      quantity, token: String(countToday + 1),
      status: shop.autoAcceptOrders ? 'Accepted' : 'Placed',
      createdAt: new Date().toISOString()
    };
    this.db.orders.push(order);
    this.save();
    return this.toOrder(order);
  }

  override async getMyOrders(): Promise<Order[]> {
    return this.db.orders
      .filter(o => o.userId === this.currentUserId())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(o => this.toOrder(o));
  }

  override async getIncomingOrders(shopId: number): Promise<Order[]> {
    this.ownedShop(shopId);
    return this.db.orders
      .filter(o => o.shopId === shopId && (o.status === 'Placed' || o.status === 'Accepted'))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(o => this.toOrder(o));
  }

  override async acceptOrder(id: number): Promise<Order> {
    return this.transition(id, 'Placed', 'Accepted');
  }

  override async rejectOrder(id: number): Promise<Order> {
    return this.transition(id, 'Placed', 'Rejected');
  }

  override async deliverOrder(id: number): Promise<Order> {
    return this.transition(id, 'Accepted', 'Delivered');
  }

  // ---- Wallet ----

  override async getWallet(): Promise<Wallet> {
    const userId = this.currentUserId();
    const user = this.db.users.find(u => u.id === userId)!;
    const transactions = this.db.ledger
      .filter(e => e.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { balance: user.walletBalance, transactions };
  }

  // ---- Internals ----

  private transition(id: number, from: OrderStatus, to: OrderStatus): Order {
    const order = this.db.orders.find(o => o.id === id);
    const shop = order && this.db.shops.find(s => s.id === order.shopId);
    if (!order || !shop || shop.ownerId !== this.currentUserId()) throw { error: 'Order not found.' };
    if (order.status !== from) throw { error: `Order is ${order.status}, expected ${from}.` };

    order.status = to;
    const sub = this.db.subscriptions.find(s => s.id === order.subscriptionId)!;
    if (to === 'Rejected') {
      sub.cupsUsed -= order.quantity;
    } else if (to === 'Delivered') {
      order.deliveredAt = new Date().toISOString();
      const perCup = sub.cupsTotal === 0 ? 0 : this.round(sub.amountPaid / sub.cupsTotal);
      const amount = Math.min(this.round(perCup * order.quantity), sub.escrowRemaining);
      sub.escrowRemaining = this.round(sub.escrowRemaining - amount);
      shop.payableBalance = this.round(shop.payableBalance + amount);
      const beverage = this.beverageName(sub.planId);
      const customer = this.db.users.find(u => u.id === order.userId)!;
      this.addLedger('CupSettlement', amount,
        { userId: order.userId, shopId: shop.id, subscriptionId: sub.id, orderId: order.id },
        `${order.quantity} × ${beverage} delivered to ${customer.name} (#${order.token})`);
    }
    this.save();
    return this.toOrder(order);
  }

  private currentUserId(): number {
    const raw = storage.get('chai_auth');
    if (raw) return (JSON.parse(raw) as AuthResponse).userId;
    throw { error: 'Not logged in.' };
  }

  private ownedShop(id: number): DbShop {
    const shop = this.db.shops.find(s => s.id === id);
    if (!shop || shop.ownerId !== this.currentUserId()) throw { error: 'Shop not found.' };
    return shop;
  }

  private toAuth(user: DbUser): AuthResponse {
    return { token: 'demo-token', userId: user.id, name: user.name, email: user.email, role: user.role };
  }

  private toShop(shop: DbShop): Shop {
    return {
      id: shop.id, name: shop.name, address: shop.address, autoAcceptOrders: shop.autoAcceptOrders,
      menuItems: this.db.menuItems.filter(m => m.shopId === shop.id),
      plans: this.db.plans.filter(p => p.shopId === shop.id).map(p => this.toPlan(p))
    };
  }

  private toPlan(plan: DbPlan): Plan {
    const menuItem = this.db.menuItems.find(m => m.id === plan.menuItemId);
    return {
      id: plan.id, name: plan.name, menuItemId: plan.menuItemId,
      menuItemName: menuItem?.name ?? '', price: plan.price, cupCount: plan.cupCount,
      validityDays: plan.validityDays, cancellationFeePercent: plan.cancellationFeePercent,
      isActive: plan.isActive
    };
  }

  private toSubscription(sub: DbSubscription): Subscription {
    const plan = this.db.plans.find(p => p.id === sub.planId);
    const shop = this.db.shops.find(s => s.id === sub.shopId);
    return {
      id: sub.id, planId: sub.planId, planName: plan?.name ?? '',
      shopId: sub.shopId, shopName: shop?.name ?? '',
      beverageName: this.beverageName(sub.planId),
      startsAt: sub.startsAt, expiresAt: sub.expiresAt,
      cupsTotal: sub.cupsTotal, cupsUsed: sub.cupsUsed,
      cupsRemaining: sub.cupsTotal - sub.cupsUsed,
      amountPaid: sub.amountPaid, escrowRemaining: sub.escrowRemaining,
      perCupValue: sub.cupsTotal === 0 ? 0 : this.round(sub.amountPaid / sub.cupsTotal),
      status: sub.status
    };
  }

  private toOrder(order: DbOrder): Order {
    const sub = this.db.subscriptions.find(s => s.id === order.subscriptionId);
    const shop = this.db.shops.find(s => s.id === order.shopId);
    const user = this.db.users.find(u => u.id === order.userId);
    return {
      id: order.id, subscriptionId: order.subscriptionId, shopId: order.shopId,
      shopName: shop?.name ?? '', customerName: user?.name ?? '',
      beverageName: sub ? this.beverageName(sub.planId) : '',
      quantity: order.quantity, token: order.token, status: order.status,
      createdAt: order.createdAt, deliveredAt: order.deliveredAt
    };
  }

  private beverageName(planId: number): string {
    const plan = this.db.plans.find(p => p.id === planId);
    return this.db.menuItems.find(m => m.id === plan?.menuItemId)?.name ?? '';
  }

  private addLedger(
    type: string, amount: number,
    refs: { userId?: number; shopId?: number; subscriptionId?: number; orderId?: number },
    description: string
  ): void {
    this.db.ledger.push({ id: this.nextId(), type, amount, ...refs, description, createdAt: new Date().toISOString() });
  }

  private nextId(): number {
    return ++this.db.seq;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private loadDb(): Db {
    try {
      const raw = storage.get(STORE_KEY);
      if (raw) return JSON.parse(raw) as Db;
    } catch { /* use seed */ }
    return seed();
  }

  private save(): void {
    storage.set(STORE_KEY, JSON.stringify(this.db));
  }
}
