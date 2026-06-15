import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).parseUrl('/login');
};

/** Redirects already-logged-in users away from login page to their home. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  if (!auth.isLoggedIn() || !user) return true;
  return inject(Router).parseUrl(auth.homeFor(user.role));
};

export function roleGuard(roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const user = auth.user();
    if (user && roles.includes(user.role)) return true;
    return inject(Router).parseUrl('/login');
  };
}
