import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';

export interface SessionUser {
  id: string; name: string; email: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'WAITER' | 'KITCHEN';
  restaurantId: string | null;
  outletId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly user = signal<SessionUser | null>(this.restore());
  readonly token = signal<string | null>(sessionStorage.getItem('ros_token'));
  readonly isLoggedIn = computed(() => !!this.token());

  login(email: string, password: string) {
    return this.api.post<{ accessToken: string; user: SessionUser }>('/auth/login', { email, password }).pipe(
      tap(({ data }) => {
        this.token.set(data.accessToken);
        this.user.set(data.user);
        sessionStorage.setItem('ros_token', data.accessToken);
        sessionStorage.setItem('ros_user', JSON.stringify(data.user));
      })
    );
  }

  logout() {
    this.api.post('/auth/logout', {}).subscribe();
    sessionStorage.clear();
    this.token.set(null);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  /** Force logout with a message shown on the login screen (outlet deactivated etc.) */
  logoutWithMessage(message: string) {
    this.api.post('/auth/logout', {}).subscribe();
    sessionStorage.clear();
    sessionStorage.setItem('ros_logout_msg', message);
    this.token.set(null);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  /** Consume and return the pending logout message (called once by login page). */
  consumeLogoutMessage(): string | null {
    const msg = sessionStorage.getItem('ros_logout_msg');
    if (msg) sessionStorage.removeItem('ros_logout_msg');
    return msg;
  }

  homeFor(role: SessionUser['role']): string {
    if (role === 'SUPER_ADMIN') return '/admin';
    if (role === 'KITCHEN') return '/kitchen';
    return '/dashboard';
  }

  private restore(): SessionUser | null {
    try { return JSON.parse(sessionStorage.getItem('ros_user') || 'null'); } catch { return null; }
  }
}
