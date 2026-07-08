import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Wallet } from '../../core/models';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonList, IonItem, IonLabel, IonNote, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Wallet</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>Available balance</ion-card-subtitle>
          <ion-card-title>₹{{ wallet?.balance ?? 0 }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Applied automatically when you choose “Use wallet” on a new subscription.
        </ion-card-content>
      </ion-card>

      <ion-list>
        @for (tx of wallet?.transactions ?? []; track tx.id) {
          <ion-item>
            <ion-label>
              <h3>{{ tx.description }}</h3>
              <p>{{ tx.createdAt | date:'d MMM y, h:mm a' }}</p>
            </ion-label>
            <ion-note slot="end">₹{{ tx.amount }}</ion-note>
          </ion-item>
        } @empty {
          <ion-item lines="none"><ion-label>No activity yet.</ion-label></ion-item>
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
