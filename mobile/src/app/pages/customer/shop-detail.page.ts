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
            <ion-item lines="none"><ion-label>No menu items yet.</ion-label></ion-item>
          }

          <ion-list-header><ion-label>Subscription plans</ion-label></ion-list-header>
          @for (plan of activePlans; track plan.id) {
            <ion-item>
              <ion-label>
                <h2>{{ plan.name }} — ₹{{ plan.price }}</h2>
                <p>{{ plan.cupCount }} × {{ plan.menuItemName }} · valid {{ plan.validityDays }} days</p>
                <p>Cancellation fee: {{ plan.cancellationFeePercent }}% of unused balance</p>
              </ion-label>
              <ion-button slot="end" size="small" (click)="subscribe(plan)">Subscribe</ion-button>
            </ion-item>
          } @empty {
            <ion-item lines="none"><ion-label>No plans offered yet.</ion-label></ion-item>
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
    const alert = await this.alerts.create({
      header: 'Confirm subscription',
      message: `${plan.name}: ₹${plan.price} for ${plan.cupCount} cups of ${plan.menuItemName}.`,
      inputs: [
        { name: 'useWallet', type: 'checkbox', label: 'Use wallet balance', value: 'yes' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'OK', handler: (data) => void this.doSubscribe(plan, (data as string[]).includes('yes')) }
      ]
    });
    await alert.present();
  }

  private async doSubscribe(plan: Plan, useWallet: boolean): Promise<void> {
    try {
      await this.api.subscribe(plan.id, useWallet);
      await this.notify('Subscription added.');
    } catch (e: any) {
      await this.notify(typeof e?.error === 'string' ? e.error : 'Could not subscribe.');
    }
  }

  private async notify(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500 });
    await t.present();
  }
}
