import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController, IonBackButton, IonButton, IonButtons, IonContent, IonHeader,
  IonItem, IonLabel, IonList, IonListHeader, IonNote, IonTitle, IonToolbar,
  ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Plan, Shop } from '../../core/models';

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonList, IonListHeader, IonItem, IonLabel, IonNote, IonButton
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/customer/shops"></ion-back-button></ion-buttons>
        <ion-title>{{ shop?.name }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (shop) {
        <ion-list>
          <ion-list-header><ion-label>Menu</ion-label></ion-list-header>
          @for (item of shop.menuItems; track item.id) {
            <ion-item>
              <ion-label>{{ item.name }}</ion-label>
              <ion-note slot="end">₹{{ item.price }}</ion-note>
            </ion-item>
          } @empty {
            <ion-item lines="none"><ion-label color="medium">No menu items yet.</ion-label></ion-item>
          }

          <ion-list-header><ion-label>Subscription plans</ion-label></ion-list-header>
          @for (plan of activePlans; track plan.id) {
            <ion-item>
              <ion-label>
                <h2>{{ plan.name }}</h2>
                <p>{{ plan.cupCount }} × {{ plan.menuItemName }} · valid {{ plan.validityDays }} days</p>
                <p>Cancel anytime — {{ plan.cancellationFeePercent }}% fee on unused balance</p>
              </ion-label>
              <ion-button slot="end" (click)="subscribe(plan)">₹{{ plan.price }}/mo</ion-button>
            </ion-item>
          } @empty {
            <ion-item lines="none"><ion-label color="medium">No plans offered yet.</ion-label></ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `
})
export class ShopDetailPage {
  shop?: Shop;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private alerts: AlertController,
    private toast: ToastController
  ) {}

  get activePlans(): Plan[] {
    return this.shop?.plans.filter(p => p.isActive) ?? [];
  }

  async ionViewWillEnter(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.shop = await this.api.getShop(id);
  }

  async subscribe(plan: Plan): Promise<void> {
    const perCup = (plan.price / plan.cupCount).toFixed(2);
    const alert = await this.alerts.create({
      header: plan.name,
      message: `₹${plan.price} for ${plan.cupCount} cups of ${plan.menuItemName} (₹${perCup}/cup). Use wallet balance if available?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Pay without wallet', handler: () => void this.doSubscribe(plan, false) },
        { text: 'Use wallet', handler: () => void this.doSubscribe(plan, true) }
      ]
    });
    await alert.present();
  }

  private async doSubscribe(plan: Plan, useWallet: boolean): Promise<void> {
    try {
      await this.api.subscribe(plan.id, useWallet);
      const t = await this.toast.create({
        message: `Subscribed! ${plan.cupCount} cups waiting for you.`,
        duration: 2000,
        color: 'success'
      });
      await t.present();
    } catch (e: any) {
      const t = await this.toast.create({
        message: typeof e?.error === 'string' ? e.error : 'Could not subscribe.',
        duration: 2500,
        color: 'danger'
      });
      await t.present();
    }
  }
}
