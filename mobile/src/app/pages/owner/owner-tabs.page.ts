import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cashOutline, notificationsOutline, storefrontOutline } from 'ionicons/icons';

@Component({
  selector: 'app-owner-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="queue">
          <ion-icon name="notifications-outline"></ion-icon>
          <ion-label>Orders</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="shop">
          <ion-icon name="storefront-outline"></ion-icon>
          <ion-label>My Shop</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="earnings">
          <ion-icon name="cash-outline"></ion-icon>
          <ion-label>Earnings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `
})
export class OwnerTabsPage {
  constructor() {
    addIcons({ notificationsOutline, storefrontOutline, cashOutline });
  }
}
