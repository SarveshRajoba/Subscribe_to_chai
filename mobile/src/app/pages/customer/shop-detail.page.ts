import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController, IonBackButton, IonBadge, IonButton, IonButtons, IonChip,
  IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonNote,
  IonTitle, IonToolbar, ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/api.service';
import { Plan, Shop, ShopQuestion, ShopReviews } from '../../core/models';

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [
    DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonList, IonListHeader, IonItem, IonLabel, IonNote, IonButton, IonBadge, IonChip
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
          <ion-item lines="full">
            <ion-label>
              <h2>
                {{ shop.name }}
                @if (shop.isVerified) {
                  <ion-badge color="success">Verified</ion-badge>
                }
              </h2>
              <p>{{ shop.address }}</p>
              <p>
                ★ {{ shop.combinedRating || '—' }}
                @if (shop.appRatingCount) { <span>· {{ shop.appRatingCount }} app</span> }
                @if (shop.googleRatingCount) { <span>· {{ shop.googleRatingCount }} Google</span> }
              </p>
            </ion-label>
          </ion-item>

          @if (shop.specialities.length) {
            <ion-item lines="none">
              <ion-label>
                <p>Known for</p>
                <div class="chips">
                  @for (s of shop.specialities; track s) {
                    <ion-chip color="primary" [outline]="true">{{ s }}</ion-chip>
                  }
                </div>
              </ion-label>
            </ion-item>
          }

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

          <ion-list-header>
            <ion-label>Reviews {{ reviews ? '(' + reviews.appRatingCount + ')' : '' }}</ion-label>
            <ion-button size="small" (click)="writeReview()">Write review</ion-button>
          </ion-list-header>
          @for (r of goodReviews; track r.id) {
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h3>{{ stars(r.rating) }} · {{ r.userName }}</h3>
                @if (r.comment) { <p class="good">{{ r.comment }}</p> }
              </ion-label>
              <ion-badge slot="end" color="success">Good</ion-badge>
            </ion-item>
          }
          @for (r of badReviews; track r.id) {
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h3>{{ stars(r.rating) }} · {{ r.userName }}</h3>
                @if (r.comment) { <p>{{ r.comment }}</p> }
              </ion-label>
            </ion-item>
          }
          @if (reviews && reviews.appRatingCount === 0) {
            <ion-item lines="none"><ion-label>No reviews yet. Be the first after your first order.</ion-label></ion-item>
          }

          <ion-list-header>
            <ion-label>Questions</ion-label>
            <ion-button size="small" (click)="ask()">Ask</ion-button>
          </ion-list-header>
          @for (q of questions; track q.id) {
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h3>{{ q.userName }} asked</h3>
                <p>{{ q.body }}</p>
                @if (q.answer) {
                  <p class="answer">Shop: {{ q.answer }}</p>
                } @else {
                  <p class="pending">Awaiting shop's reply · {{ q.createdAt | date:'d MMM' }}</p>
                }
              </ion-label>
            </ion-item>
          } @empty {
            <ion-item lines="none"><ion-label>No questions yet.</ion-label></ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    .chips { margin-top: 4px; }
    .good { color: var(--ion-color-primary); }
    .answer { color: var(--ion-color-primary); }
    .pending { color: var(--ion-color-medium); }
    ion-badge { margin-left: 6px; }
  `]
})
export class ShopDetailPage {
  shop?: Shop;
  reviews?: ShopReviews;
  questions: ShopQuestion[] = [];

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private alerts: AlertController,
    private toast: ToastController
  ) {}

  get activePlans(): Plan[] {
    return this.shop?.plans.filter(p => p.isActive) ?? [];
  }
  get goodReviews() {
    return this.reviews?.good ?? [];
  }
  get badReviews() {
    return this.reviews?.bad ?? [];
  }

  async ionViewWillEnter(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    await this.load(id);
  }

  private async load(id: number): Promise<void> {
    this.shop = await this.api.getShop(id);
    this.reviews = await this.api.getReviews(id);
    this.questions = await this.api.getQuestions(id);
  }

  stars(n: number): string {
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  async subscribe(plan: Plan): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Confirm subscription',
      message: `${plan.name}: ₹${plan.price} for ${plan.cupCount} cups of ${plan.menuItemName}.`,
      inputs: [{ name: 'useWallet', type: 'checkbox', label: 'Use wallet balance', value: 'yes' }],
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
      await this.notify(this.err(e, 'Could not subscribe.'));
    }
  }

  async writeReview(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Write a review',
      message: 'Rate this shop (1–5) and add a note. You can review only after an order has been delivered.',
      inputs: [
        { name: 'rating', type: 'number', min: 1, max: 5, placeholder: 'Rating 1–5' },
        { name: 'comment', type: 'textarea', placeholder: 'e.g. Strong elaichi chai, large cup' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Submit', handler: (data) => void this.doReview(Number(data.rating), data.comment) }
      ]
    });
    await alert.present();
  }

  private async doReview(rating: number, comment: string): Promise<void> {
    try {
      await this.api.addReview(this.shop!.id, rating, comment ?? '');
      await this.load(this.shop!.id);
      await this.notify('Thanks for your review.');
    } catch (e: any) {
      await this.notify(this.err(e, 'Could not save the review.'));
    }
  }

  async ask(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Ask the shop',
      inputs: [{ name: 'body', type: 'textarea', placeholder: 'e.g. Do you have sugarless chai?' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Send', handler: (data) => void this.doAsk(data.body) }
      ]
    });
    await alert.present();
  }

  private async doAsk(body: string): Promise<void> {
    try {
      await this.api.askQuestion(this.shop!.id, body ?? '');
      await this.load(this.shop!.id);
      await this.notify('Question sent.');
    } catch (e: any) {
      await this.notify(this.err(e, 'Could not send the question.'));
    }
  }

  private err(e: any, fallback: string): string {
    return typeof e?.error === 'string' ? e.error : fallback;
  }

  private async notify(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500 });
    await t.present();
  }
}
