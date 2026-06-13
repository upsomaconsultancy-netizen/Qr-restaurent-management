import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      let message = 'Something went wrong. Please try again.';

      if (error?.error?.message) {
        message = error.error.message;
      } else if (error?.message) {
        message = error.message;
      }

      const details = error?.error?.details;
      if (details) {
        const detailText = Array.isArray(details) ? details.join(', ') : String(details);
        if (detailText) {
          message = `${message}${message.endsWith('.') ? '' : ':'} ${detailText}`;
        }
      }

      toast.show(message, 'danger');
      return throwError(() => error);
    })
  );
};
