import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote,
  IonSegment, IonSegmentButton, IonLabel, IonText, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { AuthResponse, UserRole } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonInput, IonButton, IonSegment, IonSegmentButton, IonLabel,
    IonText, IonNote
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Subscribe to Chai</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="wrap">
        <ion-segment [(ngModel)]="method" (ngModelChange)="reset()">
          <ion-segment-button value="phone"><ion-label>Phone</ion-label></ion-segment-button>
          <ion-segment-button value="email"><ion-label>Email</ion-label></ion-segment-button>
        </ion-segment>

        <!-- Phone + OTP -->
        @if (method === 'phone') {
          @if (step === 'phone') {
            <ion-list>
              <ion-item>
                <ion-input label="Mobile number" labelPlacement="floating" type="tel"
                  inputmode="tel" [(ngModel)]="phone" placeholder="10-digit number"></ion-input>
              </ion-item>
            </ion-list>
            <ion-button expand="block" (click)="sendCode()" [disabled]="busy">Send code</ion-button>
          } @else {
            <ion-list>
              <ion-item>
                <ion-input label="Enter OTP" labelPlacement="floating" type="tel"
                  inputmode="numeric" [(ngModel)]="code" placeholder="4-digit code"></ion-input>
              </ion-item>
              <ion-item>
                <ion-input label="Name (new users)" labelPlacement="floating" [(ngModel)]="name"></ion-input>
              </ion-item>
              <ion-item>
                <ion-label>Account type</ion-label>
                <ion-segment [(ngModel)]="role">
                  <ion-segment-button value="Customer"><ion-label>Customer</ion-label></ion-segment-button>
                  <ion-segment-button value="Owner"><ion-label>Shop owner</ion-label></ion-segment-button>
                </ion-segment>
              </ion-item>
            </ion-list>
            @if (demoCode) {
              <ion-note class="hint" color="medium">Demo mode — your code is {{ demoCode }}</ion-note>
            }
            <ion-button expand="block" (click)="verify()" [disabled]="busy">Verify &amp; continue</ion-button>
            <ion-button expand="block" fill="clear" (click)="step = 'phone'">Change number</ion-button>
          }
        }

        <!-- Email + password -->
        @if (method === 'email') {
          <ion-segment [(ngModel)]="emailMode">
            <ion-segment-button value="login"><ion-label>Login</ion-label></ion-segment-button>
            <ion-segment-button value="register"><ion-label>Register</ion-label></ion-segment-button>
          </ion-segment>
          <ion-list>
            @if (emailMode === 'register') {
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
            @if (emailMode === 'register') {
              <ion-item>
                <ion-label>Account type</ion-label>
                <ion-segment [(ngModel)]="role">
                  <ion-segment-button value="Customer"><ion-label>Customer</ion-label></ion-segment-button>
                  <ion-segment-button value="Owner"><ion-label>Shop owner</ion-label></ion-segment-button>
                </ion-segment>
              </ion-item>
            }
          </ion-list>
          <ion-button expand="block" (click)="submitEmail()" [disabled]="busy">
            {{ emailMode === 'login' ? 'Login' : 'Register' }}
          </ion-button>
        }

        <!-- Third-party -->
        <ion-button expand="block" fill="outline" (click)="google()" [disabled]="busy">
          Continue with Google
        </ion-button>

        @if (error) {
          <ion-text color="danger"><p class="hint">{{ error }}</p></ion-text>
        }

        @if (demoMode) {
          <ion-text color="medium">
            <p class="hint">
              Demo mode — data stays in your browser. Phone login works with any
              number (code {{ demoOtpHint }}). Or use owner&#64;demo.com on the Email tab.
            </p>
          </ion-text>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .wrap { max-width: 420px; margin: 0 auto; }
    ion-button { margin-top: 16px; }
    .hint { text-align: center; font-size: 0.85rem; }
  `]
})
export class LoginPage {
  readonly demoMode = !environment.apiUrl;
  readonly demoOtpHint = '1234';

  method: 'phone' | 'email' = 'phone';
  emailMode: 'login' | 'register' = 'login';
  step: 'phone' | 'code' = 'phone';

  phone = '';
  code = '';
  demoCode = '';
  name = '';
  email = '';
  password = '';
  role: UserRole = 'Customer';
  error = '';
  busy = false;

  constructor(private auth: AuthService, private router: Router) {}

  reset(): void {
    this.error = '';
    this.step = 'phone';
    this.demoCode = '';
  }

  async sendCode(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const res = await this.auth.requestOtp(this.phone);
      this.demoCode = res.demoCode ?? '';
      this.step = 'code';
    } catch (e: any) {
      this.error = this.msg(e, 'Could not send the code.');
    } finally {
      this.busy = false;
    }
  }

  async verify(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const user = await this.auth.verifyOtp(this.phone, this.code, this.name, this.role);
      await this.go(user);
    } catch (e: any) {
      this.error = this.msg(e, 'Could not verify the code.');
    } finally {
      this.busy = false;
    }
  }

  async submitEmail(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const user = this.emailMode === 'login'
        ? await this.auth.login(this.email, this.password)
        : await this.auth.register(this.name, this.email, this.password, this.role);
      await this.go(user);
    } catch (e: any) {
      this.error = this.msg(e, 'Login failed. Check your details.');
    } finally {
      this.busy = false;
    }
  }

  async google(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      // A real Google button supplies an ID token here; until a client ID is
      // configured the server declines, which we surface plainly.
      const user = await this.auth.googleSignIn('', this.name, this.role);
      await this.go(user);
    } catch (e: any) {
      this.error = this.msg(e, 'Google sign-in is not available yet.');
    } finally {
      this.busy = false;
    }
  }

  private async go(user: AuthResponse): Promise<void> {
    await this.router.navigateByUrl(user.role === 'Owner' ? '/owner' : '/customer', { replaceUrl: true });
  }

  private msg(e: any, fallback: string): string {
    return typeof e?.error === 'string' ? e.error : fallback;
  }
}
