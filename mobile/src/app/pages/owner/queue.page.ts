import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar, ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Order, Shop } from '../../core/models';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonButton, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Incoming Orders</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (!shop) {
        <ion-list>
          <ion-item lines="none">
            <ion-label>Set up your shop first in the My Shop tab.</ion-label>
          </ion-item>
        </ion-list>
      } @else {
        <ion-list>
          @for (order of orders; track order.id) {
            <ion-item lines="none">
              <ion-label>
                <h2>{{ order.customerName }} · token #{{ order.token }}</h2>
                <p>{{ order.quantity }} × {{ order.beverageName }} · {{ order.createdAt | date:'h:mm a' }} · {{ order.status }}</p>
              </ion-label>
            </ion-item>
            <div class="actions">
              @if (order.status === 'Placed') {
                <ion-button size="small" (click)="accept(order)">Accept</ion-button>
                <ion-button size="small" color="danger" (click)="reject(order)">Reject</ion-button>
              } @else {
                <ion-button size="small" (click)="deliver(order)">Mark delivered</ion-button>
              }
            </div>
          } @empty {
            <ion-item lines="none">
              <ion-label>No pending orders. Pull down to refresh.</ion-label>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    .actions {
      padding: 0 16px 8px;
      border-bottom: 1px solid var(--ion-color-step-150, #d7d8da);
    }
  `]
})
export class QueuePage {
  shop?: Shop;
  orders: Order[] = [];

  constructor(private api: ApiService, private toast: ToastController) {}

  async ionViewWillEnter(): Promise<void> {
    const shops = await this.api.getMyShops();
    this.shop = shops[0];
    await this.load();
  }

  async load(): Promise<void> {
    if (this.shop) {
      this.orders = await this.api.getIncomingOrders(this.shop.id);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  async accept(order: Order): Promise<void> {
    await this.act(() => this.api.acceptOrder(order.id), `Order #${order.token} accepted.`);
  }

  async reject(order: Order): Promise<void> {
    await this.act(() => this.api.rejectOrder(order.id), `Order #${order.token} rejected. Cups returned to the customer.`);
  }

  async deliver(order: Order): Promise<void> {
    await this.act(() => this.api.deliverOrder(order.id), `Order #${order.token} delivered. Amount added to your balance.`);
  }

  private async act(fn: () => Promise<Order>, message: string): Promise<void> {
    try {
      await fn();
      await this.load();
      const t = await this.toast.create({ message, duration: 2500 });
      await t.present();
    } catch (e: any) {
      const t = await this.toast.create({
        message: typeof e?.error === 'string' ? e.error : 'Action failed.',
        duration: 2500
      });
      await t.present();
    }
  }
}
