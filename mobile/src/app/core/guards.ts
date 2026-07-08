import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.role === 'Customer') return true;
  return router.parseUrl(auth.role === 'Owner' ? '/owner' : '/login');
};

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.role === 'Owner') return true;
  return router.parseUrl(auth.role === 'Customer' ? '/customer' : '/login');
};
