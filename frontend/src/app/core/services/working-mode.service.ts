import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'ros-working-mode';

/**
 * Focused "Working Mode" for the Owner and Waiter dashboards. When enabled, the
 * UI hides analytics/reports/settings/menu/table management and secondary
 * features, leaving only live orders, active orders, notifications and order
 * status actions. Persisted to localStorage so it survives refreshes.
 * (Not used by the Kitchen Dashboard.)
 */
@Injectable({ providedIn: 'root' })
export class WorkingModeService {
  private platformId = inject(PLATFORM_ID);
  readonly enabled = signal<boolean>(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.enabled.set(localStorage.getItem(STORAGE_KEY) === '1');
  }

  toggle() { this.set(!this.enabled()); }

  set(on: boolean) {
    this.enabled.set(on);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    }
  }
}
