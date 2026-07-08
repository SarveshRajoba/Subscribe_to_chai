import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withHashLocation } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/auth.interceptor';
import { ApiService } from './app/core/api.service';
import { MockApiService } from './app/core/mock-api.service';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    // Hash-based routing so the app works on static hosts (GitHub Pages)
    // without server-side rewrites.
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor])),
    // No API URL configured (static web deployment) -> in-browser demo mode.
    ...(environment.apiUrl ? [] : [{ provide: ApiService, useClass: MockApiService }]),
  ],
});
