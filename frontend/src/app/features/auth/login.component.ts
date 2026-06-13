import { Component, inject, signal } from '@angular/core';
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
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: ({ data }) => this.router.navigateByUrl(this.auth.homeFor(data.user.role)),
      error: (e) => { this.error.set(e?.error?.message || 'Sign in failed'); this.loading.set(false); }
    });
  }
}
