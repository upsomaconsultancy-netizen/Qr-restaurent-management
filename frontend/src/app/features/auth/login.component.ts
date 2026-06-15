import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="d-flex align-items-center justify-content-center min-vh-100">
    <div class="ros-card p-4 p-md-5" style="width: 380px;">
      <h2 class="mb-1">Restaurant OS</h2>
      <p class="text-muted small mb-4">Staff &amp; admin sign in</p>

      @if (logoutMessage()) {
        <div class="alert py-2 small mb-3" style="background:#fff3cd;border:1px solid #ffc107;color:#856404;border-radius:8px;">
          ⚠️ {{ logoutMessage() }}
        </div>
      }

      <form (ngSubmit)="submit()">
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input class="form-control" type="email" [(ngModel)]="email" name="email" required autocomplete="username">
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input class="form-control" type="password" [(ngModel)]="password" name="password" required autocomplete="current-password">
        </div>
        @if (error()) { <div class="alert alert-danger py-2 small">{{ error() }}</div> }
        <button class="btn btn-accent w-100 py-2" [disabled]="loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>`
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  logoutMessage = signal('');

  ngOnInit() {
    const msg = this.auth.consumeLogoutMessage();
    if (msg) this.logoutMessage.set(msg);
  }

  submit() {
    this.logoutMessage.set('');
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: ({ data }) => this.router.navigateByUrl(this.auth.homeFor(data.user.role)),
      error: (e) => {
        const msg = e?.error?.message || 'Sign in failed';
        // Outlet/restaurant suspended — show as a warning banner, not a red error
        const code = e?.error?.code;
        if (code === 'OUTLET_INACTIVE' || code === 'RESTAURANT_SUSPENDED') {
          this.logoutMessage.set(msg);
        } else {
          this.error.set(msg);
        }
        this.loading.set(false);
      }
    });
  }
}
