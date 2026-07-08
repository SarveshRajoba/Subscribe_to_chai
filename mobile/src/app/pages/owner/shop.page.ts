import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController, IonButton, IonButtons, IonContent, IonHeader, IonInput,
  IonItem, IonLabel, IonList, IonListHeader, IonNote, IonTitle, IonToggle,
  IonToolbar, ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Shop } from '../../core/models';

@Component({
  selector: 'app-owner-shop',
  standalone: true,
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonListHeader, IonItem, IonLabel, IonInput, IonButton, IonButtons,
    IonToggle, IonNote
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>My Shop</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()">Logout</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (!shop) {
        <ion-list inset="true">
          <ion-list-header><ion-label>Set up your shop</ion-label></ion-list-header>
          <ion-item>
            <ion-input label="Shop name" labelPlacement="floating" [(ngModel)]="name"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="Address" labelPlacement="floating" [(ngModel)]="address"></ion-input>
          </ion-item>
          <ion-item>
            <ion-toggle [(ngModel)]="autoAccept">Auto-accept orders</ion-toggle>
          </ion-item>
        </ion-list>
        <div class="ion-padding">
          <ion-button expand="block" (click)="create()">Create shop</ion-button>
        </div>
      } @else {
        <ion-list>
          <ion-list-header><ion-label>{{ shop.name }}</ion-label></ion-list-header>
          <ion-item>
            <ion-label>
              <p>{{ shop.address }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-toggle [checked]="shop.autoAcceptOrders" (ionChange)="toggleAutoAccept($event)">
              Auto-accept orders
            </ion-toggle>
          </ion-item>

          <ion-list-header>
            <ion-label>Menu</ion-label>
            <ion-button size="small" (click)="addMenuItem()">Add</ion-button>
          </ion-list-header>
          @for (item of shop.menuItems; track item.id) {
            <ion-item>
              <ion-label>{{ item.name }}</ion-label>
              <ion-note slot="end">₹{{ item.price }}</ion-note>
            </ion-item>
          } @empty {
            <ion-item lines="none"><ion-label>No menu items yet.</ion-label></ion-item>
          }

          <ion-list-header>
            <ion-label>Subscription plans</ion-label>
            <ion-button size="small" (click)="addPlan()" [disabled]="shop.menuItems.length === 0">Add</ion-button>
          </ion-list-header>
          @for (plan of shop.plans; track plan.id) {
            <ion-item>
              <ion-label>
                <h2>{{ plan.name }}</h2>
                <p>{{ plan.cupCount }} × {{ plan.menuItemName }} · ₹{{ plan.price }} · {{ plan.cancellationFeePercent }}% cancel fee</p>
              </ion-label>
            </ion-item>
          } @empty {
            <ion-item lines="none"><ion-label>No plans yet.</ion-label></ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `
})
export class OwnerShopPage {
  shop?: Shop;
  name = '';
  address = '';
  autoAccept = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private alerts: AlertController,
    private toast: ToastController
  ) {}

  async ionViewWillEnter(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    const shops = await this.api.getMyShops();
    this.shop = shops[0];
  }

  async create(): Promise<void> {
    if (!this.name.trim() || !this.address.trim()) {
      const t = await this.toast.create({ message: 'Name and address are required.', duration: 2000, color: 'warning' });
      await t.present();
      return;
    }
    this.shop = await this.api.createShop({
      name: this.name,
      address: this.address,
      autoAcceptOrders: this.autoAccept
    });
  }

  async toggleAutoAccept(event: CustomEvent): Promise<void> {
    if (!this.shop) return;
    this.shop = await this.api.updateShop(this.shop.id, {
      name: this.shop.name,
      address: this.shop.address,
      autoAcceptOrders: event.detail.checked
    });
  }

  async addMenuItem(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'New menu item',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'e.g. Masala Chai' },
        { name: 'price', type: 'number', placeholder: 'Price per cup (₹)' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => void this.doAddMenuItem(data.name, Number(data.price))
        }
      ]
    });
    await alert.present();
  }

  private async doAddMenuItem(name: string, price: number): Promise<void> {
    if (!name?.trim() || !(price > 0)) return;
    await this.api.addMenuItem(this.shop!.id, { name, price, isAvailable: true });
    await this.load();
  }

  async addPlan(): Promise<void> {
    if (!this.shop || this.shop.menuItems.length === 0) return;
    const first = this.shop.menuItems[0];
    const alert = await this.alerts.create({
      header: 'New subscription plan',
      subHeader: `For: ${first.name}` +
        (this.shop.menuItems.length > 1 ? ' (first menu item; item picker coming soon)' : ''),
      inputs: [
        { name: 'name', type: 'text', placeholder: 'e.g. Monthly 30 cups' },
        { name: 'price', type: 'number', placeholder: 'Plan price (₹)' },
        { name: 'cups', type: 'number', placeholder: 'Number of cups' },
        { name: 'fee', type: 'number', placeholder: 'Cancellation fee % (0–25)' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => void this.doAddPlan(first.id, data)
        }
      ]
    });
    await alert.present();
  }

  private async doAddPlan(menuItemId: number, data: any): Promise<void> {
    try {
      await this.api.addPlan(this.shop!.id, {
        name: data.name,
        menuItemId,
        price: Number(data.price),
        cupCount: Number(data.cups),
        validityDays: 30,
        cancellationFeePercent: Number(data.fee) || 0,
        isActive: true
      });
      await this.load();
    } catch (e: any) {
      const t = await this.toast.create({
        message: typeof e?.error === 'string' ? e.error : 'Could not create the plan.',
        duration: 2500,
        color: 'danger'
      });
      await t.present();
    }
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
