import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonNote,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Wallet } from '../../core/models';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonListHeader, IonItem, IonLabel, IonNote, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Wallet</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-list>
        <ion-item>
          <ion-label>Balance</ion-label>
          <ion-note slot="end">₹{{ wallet?.balance ?? 0 }}</ion-note>
        </ion-item>
        <ion-item lines="full">
          <ion-label>
            <p>The balance is applied when you tick “Use wallet balance” on a new subscription.</p>
          </ion-label>
        </ion-item>

        <ion-list-header><ion-label>Transactions</ion-label></ion-list-header>
        @for (tx of wallet?.transactions ?? []; track tx.id) {
          <ion-item>
            <ion-label>
              <h3>{{ tx.description }}</h3>
              <p>{{ tx.createdAt | date:'d MMM y, h:mm a' }}</p>
            </ion-label>
            <ion-note slot="end">₹{{ tx.amount }}</ion-note>
          </ion-item>
        } @empty {
          <ion-item lines="none"><ion-label>No transactions yet.</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `
})
export class WalletPage {
  wallet?: Wallet;

  constructor(private api: ApiService) {}

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.wallet = await this.api.getWallet();
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }
}
