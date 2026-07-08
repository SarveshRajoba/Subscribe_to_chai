import { Routes } from '@angular/router';
import { customerGuard, ownerGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'customer',
    canActivate: [customerGuard],
    loadComponent: () => import('./pages/customer/customer-tabs.page').then(m => m.CustomerTabsPage),
    children: [
      {
        path: 'shops',
        loadComponent: () => import('./pages/customer/shops.page').then(m => m.ShopsPage),
      },
      {
        path: 'shops/:id',
        loadComponent: () => import('./pages/customer/shop-detail.page').then(m => m.ShopDetailPage),
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./pages/customer/subscriptions.page').then(m => m.SubscriptionsPage),
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/customer/orders.page').then(m => m.OrdersPage),
      },
      {
        path: 'wallet',
        loadComponent: () => import('./pages/customer/wallet.page').then(m => m.WalletPage),
      },
      { path: '', redirectTo: 'shops', pathMatch: 'full' },
    ],
  },
  {
    path: 'owner',
    canActivate: [ownerGuard],
    loadComponent: () => import('./pages/owner/owner-tabs.page').then(m => m.OwnerTabsPage),
    children: [
      {
        path: 'queue',
        loadComponent: () => import('./pages/owner/queue.page').then(m => m.QueuePage),
      },
      {
        path: 'shop',
        loadComponent: () => import('./pages/owner/shop.page').then(m => m.OwnerShopPage),
      },
      {
        path: 'earnings',
        loadComponent: () => import('./pages/owner/earnings.page').then(m => m.EarningsPage),
      },
      { path: '', redirectTo: 'queue', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
