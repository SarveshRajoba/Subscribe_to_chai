import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonNote, IonRefresher, IonRefresherContent, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Shop } from '../../core/models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [
    RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonLabel, IonNote, IonRefresher, IonRefresherContent, IonButtons, IonButton
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Shops</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()">Logout</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <ion-list>
        @for (shop of shops; track shop.id) {
          <ion-item [routerLink]="['/customer/shops', shop.id]" detail="true">
            <ion-label>
              <h2>{{ shop.name }}</h2>
              <p>{{ shop.address }}</p>
            </ion-label>
            <ion-note slot="end">{{ shop.plans.length }} plan{{ shop.plans.length === 1 ? '' : 's' }}</ion-note>
          </ion-item>
        } @empty {
          <ion-item lines="none"><ion-label>No shops available.</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `
})
export class ShopsPage {
  shops: Shop[] = [];

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.shops = await this.api.getShops();
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
