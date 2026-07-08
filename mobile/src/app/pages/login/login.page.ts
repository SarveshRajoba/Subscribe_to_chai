import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonHeader, IonInput, IonItem, IonList, IonSegment,
  IonSegmentButton, IonLabel, IonText, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { UserRole } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonInput, IonButton, IonSegment, IonSegmentButton, IonLabel, IonText
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Subscribe to Chai</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="wrap">
        <ion-segment [(ngModel)]="mode">
          <ion-segment-button value="login"><ion-label>Login</ion-label></ion-segment-button>
          <ion-segment-button value="register"><ion-label>Register</ion-label></ion-segment-button>
        </ion-segment>

        <ion-list>
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
          @if (mode === 'register') {
            <ion-item>
              <ion-label>Account type</ion-label>
              <ion-segment [(ngModel)]="role">
                <ion-segment-button value="Customer"><ion-label>Customer</ion-label></ion-segment-button>
                <ion-segment-button value="Owner"><ion-label>Shop owner</ion-label></ion-segment-button>
              </ion-segment>
            </ion-item>
          }
        </ion-list>

        @if (error) {
          <ion-text color="danger"><p>{{ error }}</p></ion-text>
        }

        <ion-button expand="block" (click)="submit()" [disabled]="busy">
          {{ mode === 'login' ? 'Login' : 'Register' }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .wrap { max-width: 420px; margin: 0 auto; }
    ion-button { margin-top: 16px; }
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

  constructor(private auth: AuthService, private router: Router) {}

  async submit(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const user = this.mode === 'login'
        ? await this.auth.login(this.email, this.password)
        : await this.auth.register(this.name, this.email, this.password, this.role);
      await this.router.navigateByUrl(user.role === 'Owner' ? '/owner' : '/customer', { replaceUrl: true });
    } catch (e: any) {
      this.error = typeof e?.error === 'string' ? e.error : 'Login failed. Check your details.';
    } finally {
      this.busy = false;
    }
  }
}
