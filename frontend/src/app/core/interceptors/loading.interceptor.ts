import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

// Requests fired on every keystroke (e.g. live search), or as a background
// refresh after a socket.io event (new order, order updated, bill updated,
// kitchen queue changed), shouldn't trigger the full-screen loader — it
// would flicker over the page on every realtime update.
const SKIP_LOADER_PATTERNS = [
  /\/public\/search(\?|$)/,
  /\/tenant\/orders(\?|$)/,
  /\/tenant\/orders\/kitchen-queue(\?|$)/,
  /\/tenant\/analytics\/sales(\?|$)/,
  /\/tenant\/analytics\/items(\?|$)/,
  /\/tenant\/analytics\/time(\?|$)/,
  /\/public\/bill\/.+$/,
];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (SKIP_LOADER_PATTERNS.some((p) => p.test(req.url))) {
    return next(req);
  }

  const loader = inject(LoaderService);

  loader.show();

  return next(req).pipe(
    finalize(() => loader.hide())
  );
};
