import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'ros-theme';

/**
 * App-wide light/dark theme. Persists to localStorage and reflects the choice as
 * a `data-theme` attribute on <html> so component styles can react via
 * :host-context([data-theme="dark"]). SSR-safe: no-ops on the server.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  readonly theme = signal<Theme>('light');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.apply(initial);
  }

  toggle() {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme) {
    this.apply(theme);
  }

  private apply(theme: Theme) {
    this.theme.set(theme);
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }
}
