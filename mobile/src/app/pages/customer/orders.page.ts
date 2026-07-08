import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Order } from '../../core/models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonLabel, IonNote, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Order History</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <ion-list>
        @for (order of orders; track order.id) {
          <ion-item>
            <ion-label>
              <h2>{{ order.quantity }} × {{ order.beverageName }} · token #{{ order.token }}</h2>
              <p>{{ order.shopName }} · {{ order.createdAt | date:'d MMM, h:mm a' }}</p>
            </ion-label>
            <ion-note slot="end">{{ order.status }}</ion-note>
          </ion-item>
        } @empty {
          <ion-item lines="none"><ion-label>No orders yet.</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `
})
export class OrdersPage {
  orders: Order[] = [];

  constructor(private api: ApiService) {}

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.orders = await this.api.getMyOrders();
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }
}
