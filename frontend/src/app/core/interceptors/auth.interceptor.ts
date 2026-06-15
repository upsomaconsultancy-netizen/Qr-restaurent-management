import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// These 403 codes mean the user's account/outlet is suspended — force logout
const FORCE_LOGOUT_CODES = ['OUTLET_INACTIVE', 'OUTLET_NOT_FOUND', 'RESTAURANT_SUSPENDED', 'RESTAURANT_NOT_FOUND'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const token = auth.token();
  if (token && !req.url.includes('/public/')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Never intercept auth endpoints — let the component handle those errors directly
      if (req.url.includes('/auth/')) return throwError(() => err);

      if (err.status === 401) {
        // Token expired or invalid — silent logout
        auth.logout();
      } else if (err.status === 403) {
        const code = err.error?.code;
        if (FORCE_LOGOUT_CODES.includes(code)) {
          // Outlet/restaurant deactivated while user is logged in — force logout with message
          const message = err.error?.message || 'Your outlet has been deactivated. Please contact your main branch.';
          auth.logoutWithMessage(message);
        }
        // Other 403s (insufficient role etc.) — do NOT logout, let component handle
      }

      return throwError(() => err);
    })
  );
};
