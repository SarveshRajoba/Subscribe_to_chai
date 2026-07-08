import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cafeOutline, cardOutline, receiptOutline, storefrontOutline } from 'ionicons/icons';

@Component({
  selector: 'app-customer-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="shops">
          <ion-icon name="storefront-outline"></ion-icon>
          <ion-label>Shops</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="subscriptions">
          <ion-icon name="cafe-outline"></ion-icon>
          <ion-label>My Cups</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="orders">
          <ion-icon name="receipt-outline"></ion-icon>
          <ion-label>Orders</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="wallet">
          <ion-icon name="card-outline"></ion-icon>
          <ion-label>Wallet</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `
})
export class CustomerTabsPage {
  constructor() {
    addIcons({ storefrontOutline, cafeOutline, receiptOutline, cardOutline });
  }
}
