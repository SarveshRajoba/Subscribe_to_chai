import { Routes } from '@angular/router';
import { customerGuard, ownerGuard } from './core/guards';
import { LoginPage } from './pages/login/login.page';
import { CustomerTabsPage } from './pages/customer/customer-tabs.page';
import { ShopsPage } from './pages/customer/shops.page';
import { ShopDetailPage } from './pages/customer/shop-detail.page';
import { SubscriptionsPage } from './pages/customer/subscriptions.page';
import { OrdersPage } from './pages/customer/orders.page';
import { WalletPage } from './pages/customer/wallet.page';
import { OwnerTabsPage } from './pages/owner/owner-tabs.page';
import { QueuePage } from './pages/owner/queue.page';
import { OwnerShopPage } from './pages/owner/shop.page';
import { EarningsPage } from './pages/owner/earnings.page';

// Routes are eager (no lazy loading) so the whole app builds into a single
// bundle — required for the self-contained web demo build.
export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: 'customer',
    canActivate: [customerGuard],
    component: CustomerTabsPage,
    children: [
      { path: 'shops', component: ShopsPage },
      { path: 'shops/:id', component: ShopDetailPage },
      { path: 'subscriptions', component: SubscriptionsPage },
      { path: 'orders', component: OrdersPage },
      { path: 'wallet', component: WalletPage },
      { path: '', redirectTo: 'shops', pathMatch: 'full' },
    ],
  },
  {
    path: 'owner',
    canActivate: [ownerGuard],
    component: OwnerTabsPage,
    children: [
      { path: 'queue', component: QueuePage },
      { path: 'shop', component: OwnerShopPage },
      { path: 'earnings', component: EarningsPage },
      { path: '', redirectTo: 'queue', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
