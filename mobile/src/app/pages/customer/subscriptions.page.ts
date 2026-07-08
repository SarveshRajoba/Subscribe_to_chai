import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AlertController, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader,
  IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonProgressBar,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar, ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Subscription } from '../../core/models';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonCardContent, IonButton, IonBadge,
    IonProgressBar, IonRefresher, IonRefresherContent
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>My Cups</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @for (sub of subscriptions; track sub.id) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ sub.beverageName }} @ {{ sub.shopName }}
              <ion-badge [color]="sub.status === 'Active' ? 'success' : 'medium'">{{ sub.status }}</ion-badge>
            </ion-card-title>
            <ion-card-subtitle>{{ sub.planName }} · expires {{ sub.expiresAt | date:'d MMM y' }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p><strong>{{ sub.cupsRemaining }}</strong> of {{ sub.cupsTotal }} cups left</p>
            <ion-progress-bar [value]="sub.cupsRemaining / sub.cupsTotal"></ion-progress-bar>
            @if (sub.status === 'Active') {
              <p class="escrow">₹{{ sub.escrowRemaining }} held safely in escrow</p>
              <ion-button (click)="order(sub)">Order cups</ion-button>
              <ion-button fill="outline" color="danger" (click)="cancel(sub)">Cancel &amp; move funds</ion-button>
            }
          </ion-card-content>
        </ion-card>
      } @empty {
        <div class="ion-padding ion-text-center">
          <p>No subscriptions yet — find a shop in the Shops tab and grab a plan.</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .escrow { color: var(--ion-color-medium); margin: 8px 0; }
    ion-progress-bar { margin: 8px 0; }
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
      header: `Order ${sub.beverageName}`,
      message: `${sub.cupsRemaining} cups left. How many?`,
      inputs: [{ name: 'quantity', type: 'number', min: 1, max: sub.cupsRemaining, value: 1 }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Order',
          handler: (data) => void this.placeOrder(sub, Number(data.quantity))
        }
      ]
    });
    await alert.present();
  }

  private async placeOrder(sub: Subscription, quantity: number): Promise<void> {
    try {
      const order = await this.api.placeOrder(sub.id, quantity);
      await this.load();
      const t = await this.toast.create({
        message: `Order placed! Your pickup token is #${order.token}.`,
        duration: 3000,
        color: 'success'
      });
      await t.present();
    } catch (e: any) {
      const t = await this.toast.create({
        message: typeof e?.error === 'string' ? e.error : 'Could not place the order.',
        duration: 2500,
        color: 'danger'
      });
      await t.present();
    }
  }

  async cancel(sub: Subscription): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Cancel subscription?',
      message: `₹${sub.escrowRemaining} is unused. The shop keeps a small convenience fee and the rest goes to your wallet — ready to spend at any other shop.`,
      buttons: [
        { text: 'Keep it', role: 'cancel' },
        {
          text: 'Cancel & refund',
          role: 'destructive',
          handler: () => void this.doCancel(sub)
        }
      ]
    });
    await alert.present();
  }

  private async doCancel(sub: Subscription): Promise<void> {
    try {
      const result = await this.api.cancelSubscription(sub.id);
      await this.load();
      const t = await this.toast.create({
        message: `Done. ₹${result.refundedToWallet} added to your wallet (₹${result.convenienceFee} fee).`,
        duration: 3500,
        color: 'success'
      });
      await t.present();
    } catch (e: any) {
      const t = await this.toast.create({
        message: typeof e?.error === 'string' ? e.error : 'Could not cancel.',
        duration: 2500,
        color: 'danger'
      });
      await t.present();
    }
  }
}
