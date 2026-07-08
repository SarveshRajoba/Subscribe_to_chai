import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonNote,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Shop, ShopEarnings } from '../../core/models';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonListHeader, IonItem, IonLabel, IonNote, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Earnings</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-list>
        <ion-item>
          <ion-label>Balance awaiting payout</ion-label>
          <ion-note slot="end">₹{{ earnings?.payableBalance ?? 0 }}</ion-note>
        </ion-item>
        <ion-item lines="full">
          <ion-label>
            <p>Money is added when an order is marked delivered, plus any cancellation fees.</p>
          </ion-label>
        </ion-item>

        <ion-list-header><ion-label>History</ion-label></ion-list-header>
        @for (entry of earnings?.entries ?? []; track entry.id) {
          <ion-item>
            <ion-label>
              <h3>{{ entry.description }}</h3>
              <p>{{ entry.type }} · {{ entry.createdAt | date:'d MMM, h:mm a' }}</p>
            </ion-label>
            <ion-note slot="end">₹{{ entry.amount }}</ion-note>
          </ion-item>
        } @empty {
          <ion-item lines="none"><ion-label>No earnings yet.</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `
})
export class EarningsPage {
  shop?: Shop;
  earnings?: ShopEarnings;

  constructor(private api: ApiService) {}

  async ionViewWillEnter(): Promise<void> {
    const shops = await this.api.getMyShops();
    this.shop = shops[0];
    await this.load();
  }

  async load(): Promise<void> {
    if (this.shop) {
      this.earnings = await this.api.getEarnings(this.shop.id);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }
}
