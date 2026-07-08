export type UserRole = 'Customer' | 'Owner';
export type SubscriptionStatus = 'Active' | 'Cancelled' | 'Expired';
export type OrderStatus = 'Placed' | 'Accepted' | 'Delivered' | 'Rejected' | 'Cancelled';

export interface AuthResponse {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface Plan {
  id: number;
  name: string;
  menuItemId: number;
  menuItemName: string;
  price: number;
  cupCount: number;
  validityDays: number;
  cancellationFeePercent: number;
  isActive: boolean;
}

export interface Shop {
  id: number;
  name: string;
  address: string;
  autoAcceptOrders: boolean;
  menuItems: MenuItem[];
  plans: Plan[];
}

export interface Subscription {
  id: number;
  planId: number;
  planName: string;
  shopId: number;
  shopName: string;
  beverageName: string;
  startsAt: string;
  expiresAt: string;
  cupsTotal: number;
  cupsUsed: number;
  cupsRemaining: number;
  amountPaid: number;
  escrowRemaining: number;
  perCupValue: number;
  status: SubscriptionStatus;
}

export interface CancelResult {
  convenienceFee: number;
  refundedToWallet: number;
}

export interface Order {
  id: number;
  subscriptionId: number;
  shopId: number;
  shopName: string;
  customerName: string;
  beverageName: string;
  quantity: number;
  token: string;
  status: OrderStatus;
  createdAt: string;
  deliveredAt?: string;
}

export interface LedgerEntry {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  transactions: LedgerEntry[];
}

export interface ShopEarnings {
  payableBalance: number;
  entries: LedgerEntry[];
}
