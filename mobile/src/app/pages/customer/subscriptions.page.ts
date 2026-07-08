import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AlertController, IonButton, IonContent, IonHeader, IonItem, IonLabel,
  IonList, IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
  ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Subscription } from '../../core/models';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonButton, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>My Subscriptions</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-list>
        @for (sub of subscriptions; track sub.id) {
          <ion-item lines="none">
            <ion-label>
              <h2>{{ sub.beverageName }} — {{ sub.shopName }}</h2>
              <p>{{ sub.planName }} · {{ sub.status }} · expires {{ sub.expiresAt | date:'d MMM y' }}</p>
              <p>{{ sub.cupsRemaining }} of {{ sub.cupsTotal }} cups left · ₹{{ sub.escrowRemaining }} unused</p>
            </ion-label>
          </ion-item>
          @if (sub.status === 'Active') {
            <div class="actions">
              <ion-button size="small" (click)="order(sub)">Order cups</ion-button>
              <ion-button size="small" color="danger" (click)="cancel(sub)">Cancel plan</ion-button>
            </div>
          }
        } @empty {
          <ion-item lines="none">
            <ion-label>No subscriptions yet. Open the Shops tab to subscribe.</ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .actions {
      padding: 0 16px 8px;
      border-bottom: 1px solid var(--ion-color-step-150, #d7d8da);
    }
  `]
})
export class SubscriptionsPage {
  subscriptions: Subscription[] = [];

  constructor(
    private api: ApiService,
    private alerts: AlertController,
    private toast: ToastController
  ) {}

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.subscriptions = await this.api.getMySubscriptions();
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  async order(sub: Subscription): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Order cups',
      message: `${sub.cupsRemaining} cups left on this plan.`,
      inputs: [{ name: 'quantity', type: 'number', min: 1, max: sub.cupsRemaining, value: 1 }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'OK', handler: (data) => void this.placeOrder(sub, Number(data.quantity)) }
      ]
    });
    await alert.present();
  }

  private async placeOrder(sub: Subscription, quantity: number): Promise<void> {
    try {
      const order = await this.api.placeOrder(sub.id, quantity);
      await this.load();
      await this.notify(`Order placed. Pickup token #${order.token}.`);
    } catch (e: any) {
      await this.notify(typeof e?.error === 'string' ? e.error : 'Could not place the order.');
    }
  }

  async cancel(sub: Subscription): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Cancel subscription',
      message: `₹${sub.escrowRemaining} is unused. The shop keeps a ` +
        `convenience fee and the rest is added to your wallet.`,
      buttons: [
        { text: 'Back', role: 'cancel' },
        { text: 'OK', handler: () => void this.doCancel(sub) }
      ]
    });
    await alert.present();
  }

  private async doCancel(sub: Subscription): Promise<void> {
    try {
      const result = await this.api.cancelSubscription(sub.id);
      await this.load();
      await this.notify(`Cancelled. ₹${result.refundedToWallet} added to wallet (fee ₹${result.convenienceFee}).`);
    } catch (e: any) {
      await this.notify(typeof e?.error === 'string' ? e.error : 'Could not cancel.');
    }
  }

  private async notify(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500 });
    await t.present();
  }
}
