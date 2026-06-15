import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoaderService {
  private _activeRequests = 0;
  readonly isLoading = signal(false);

  show(): void {
    this._activeRequests++;
    this.isLoading.set(true);
  }

  hide(): void {
    this._activeRequests = Math.max(0, this._activeRequests - 1);
    if (this._activeRequests === 0) {
      this.isLoading.set(false);
    }
  }
}
