import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonInput, IonItem, IonList, IonSegment,
  IonSegmentButton, IonLabel, IonText, ToastController
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { UserRole } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule, IonContent, IonList, IonItem, IonInput, IonButton,
    IonSegment, IonSegmentButton, IonLabel, IonText
  ],
  template: `
    <ion-content class="ion-padding">
      <div class="wrap">
        <h1>☕ Subscribe to Chai</h1>
        <p class="tagline">Your daily cutting, prepaid.</p>

        <ion-segment [(ngModel)]="mode">
          <ion-segment-button value="login"><ion-label>Login</ion-label></ion-segment-button>
          <ion-segment-button value="register"><ion-label>Register</ion-label></ion-segment-button>
        </ion-segment>

        <ion-list inset="true">
          @if (mode === 'register') {
            <ion-item>
              <ion-input label="Name" labelPlacement="floating" [(ngModel)]="name"></ion-input>
            </ion-item>
          }
          <ion-item>
            <ion-input label="Email" labelPlacement="floating" type="email" [(ngModel)]="email"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="Password" labelPlacement="floating" type="password" [(ngModel)]="password"></ion-input>
          </ion-item>
        </ion-list>

        @if (mode === 'register') {
          <ion-segment [(ngModel)]="role">
            <ion-segment-button value="Customer"><ion-label>I drink chai</ion-label></ion-segment-button>
            <ion-segment-button value="Owner"><ion-label>I run a shop</ion-label></ion-segment-button>
          </ion-segment>
        }

        @if (error) {
          <ion-text color="danger"><p>{{ error }}</p></ion-text>
        }

        <ion-button expand="block" (click)="submit()" [disabled]="busy">
          {{ mode === 'login' ? 'Login' : 'Create account' }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .wrap { max-width: 420px; margin: 10vh auto 0; }
    h1 { text-align: center; }
    .tagline { text-align: center; color: var(--ion-color-medium); margin-bottom: 24px; }
    ion-button { margin-top: 24px; }
  `]
})
export class LoginPage {
  mode: 'login' | 'register' = 'login';
  name = '';
  email = '';
  password = '';
  role: UserRole = 'Customer';
  error = '';
  busy = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastController
  ) {}

  async submit(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const user = this.mode === 'login'
        ? await this.auth.login(this.email, this.password)
        : await this.auth.register(this.name, this.email, this.password, this.role);
      await this.router.navigateByUrl(user.role === 'Owner' ? '/owner' : '/customer', { replaceUrl: true });
      const t = await this.toast.create({ message: `Welcome, ${user.name}!`, duration: 1500 });
      await t.present();
    } catch (e: any) {
      this.error = typeof e?.error === 'string' ? e.error : 'Something went wrong. Check your details.';
    } finally {
      this.busy = false;
    }
  }
}
