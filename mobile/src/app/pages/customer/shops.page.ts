import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonBadge, IonButton, IonButtons, IonChip, IonContent, IonHeader, IonItem,
  IonLabel, IonList, IonNote, IonRefresher, IonRefresherContent, IonSearchbar,
  IonTitle, IonToolbar, ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Shop } from '../../core/models';

interface ShopRow {
  shop: Shop;
  distanceKm?: number | null;
}

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [
    FormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonNote, IonRefresher, IonRefresherContent,
    IonButtons, IonButton, IonSearchbar, IonChip, IonBadge
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Shops</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()">Logout</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Search e.g. elaichi tea"
          [debounce]="300"
          [(ngModel)]="query"
          (ionInput)="onSearch()"
          (ionClear)="onSearch()"></ion-searchbar>
        <ion-buttons slot="end">
          <ion-button size="small" (click)="useMyLocation()">
            {{ locating ? '…' : (hasLocation ? 'Near me ✓' : 'Near me') }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <ion-list>
        @for (row of rows; track row.shop.id) {
          <ion-item [routerLink]="['/customer/shops', row.shop.id]" detail="true">
            <ion-label>
              <h2>
                {{ row.shop.name }}
                @if (row.shop.isVerified) { <ion-badge color="success">Verified</ion-badge> }
              </h2>
              <p>
                ★ {{ row.shop.combinedRating || '—' }} · {{ row.shop.address }}
                @if (row.distanceKm != null) { <span>· {{ row.distanceKm }} km</span> }
              </p>
              @if (row.shop.specialities.length) {
                <div class="chips">
                  @for (s of row.shop.specialities.slice(0, 3); track s) {
                    <ion-chip color="primary" [outline]="true">{{ s }}</ion-chip>
                  }
                </div>
              }
            </ion-label>
            <ion-note slot="end">{{ row.shop.plans.length }} plan{{ row.shop.plans.length === 1 ? '' : 's' }}</ion-note>
          </ion-item>
        } @empty {
          <ion-item lines="none">
            <ion-label>{{ query ? 'No shops match “' + query + '”.' : 'No shops available.' }}</ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [`.chips { margin-top: 4px; }`]
})
export class ShopsPage {
  rows: ShopRow[] = [];
  query = '';
  locating = false;
  lat?: number;
  lng?: number;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastController
  ) {}

  get hasLocation(): boolean {
    return this.lat != null && this.lng != null;
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    if (this.query.trim()) {
      const results = await this.api.searchShops(this.query.trim(), this.lat, this.lng);
      this.rows = results.map(r => ({ shop: r.shop, distanceKm: r.distanceKm }));
    } else {
      const shops = await this.api.getShops();
      this.rows = shops.map(shop => ({ shop, distanceKm: undefined }));
    }
  }

  onSearch(): void {
    void this.load();
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  async useMyLocation(): Promise<void> {
    if (!navigator.geolocation) {
      await this.notify('Location is not available on this device.');
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;
        this.locating = false;
        await this.load();
      },
      async () => {
        this.locating = false;
        await this.notify('Could not get your location. Distances are hidden.');
      },
      { timeout: 8000 }
    );
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private async notify(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500 });
    await t.present();
  }
}
