import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonBadge, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar, ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Order, Shop } from '../../core/models';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonBadge, IonButton, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Incoming orders</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (!shop) {
        <div class="ion-padding ion-text-center">
          <p>Set up your shop first in the “My Shop” tab.</p>
        </div>
      } @else {
        <ion-list>
          @for (order of orders; track order.id) {
            <ion-item>
              <ion-label>
                <h2>{{ order.customerName }} · #{{ order.token }}</h2>
                <p>{{ order.quantity }} × {{ order.beverageName }} · {{ order.createdAt | date:'h:mm a' }}</p>
              </ion-label>
              @if (order.status === 'Placed') {
                <ion-button slot="end" color="success" (click)="accept(order)">Accept</ion-button>
                <ion-button slot="end" fill="outline" color="danger" (click)="reject(order)">Reject</ion-button>
              } @else {
                <ion-badge slot="end" color="primary">Preparing</ion-badge>
                <ion-button slot="end" color="success" (click)="deliver(order)">Delivered</ion-button>
              }
            </ion-item>
          } @empty {
            <ion-item lines="none"><ion-label>No pending orders. Pull down to refresh.</ion-label></ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `
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
    await this.act(() => this.api.acceptOrder(order.id), `Accepted #${order.token} — call out "${order.customerName}" when ready.`);
  }

  async reject(order: Order): Promise<void> {
    await this.act(() => this.api.rejectOrder(order.id), `Rejected #${order.token}; cups returned to the customer.`);
  }

  async deliver(order: Order): Promise<void> {
    await this.act(() => this.api.deliverOrder(order.id), `#${order.token} delivered — payment released to your balance.`);
  }

  private async act(fn: () => Promise<Order>, message: string): Promise<void> {
    try {
      await fn();
      await this.load();
      const t = await this.toast.create({ message, duration: 2500, color: 'success' });
      await t.present();
    } catch (e: any) {
      const t = await this.toast.create({
        message: typeof e?.error === 'string' ? e.error : 'Action failed.',
        duration: 2500,
        color: 'danger'
      });
      await t.present();
    }
  }
}
