import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule,CommonModule],
  styles: [`
    .login-bg {
      min-height: 100vh;
      background: #f4f6f3;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      background: #ffffff;
      border: 1px solid #e2e8e0;
      border-radius: 16px;
      padding: 2rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1.75rem;
    }
    .brand-logo {
      width: 46px;
      height: 46px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 600;
      color: #1a2e23;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 12px;
      color: #6b8070;
      margin: 2px 0 0;
    }
    .divider {
      height: 1px;
      background: #e8ede9;
      margin-bottom: 1.5rem;
    }
    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #3d5247;
      margin-bottom: 6px;
    }
    .field-input {
      width: 100%;
      height: 42px;
      padding: 0 12px;
      font-size: 14px;
      color: #1a2e23;
      background: #f7faf8;
      border: 1px solid #d0dbd3;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .field-input:focus {
      border-color: #1D9E75;
      box-shadow: 0 0 0 3px rgba(29, 158, 117, 0.12);
      background: #fff;
    }
    .field-input::placeholder {
      color: #aabcb2;
    }
    .pw-wrap {
      position: relative;
    }
    .pw-wrap .field-input {
      padding-right: 42px;
    }
    .eye-btn {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 40px;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8aaa96;
      font-size: 16px;
      padding: 0;
    }
    .eye-btn:hover {
      color: #1D9E75;
    }
    .banner {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 1rem;
    }
    .banner-warn {
      background: #fdf3e3;
      border: 1px solid #f5c84a;
      color: #7a4e0d;
    }
    .banner-err {
      background: #fef0f0;
      border: 1px solid #f5b8b8;
      color: #8b2020;
    }
    .submit-btn {
      width: 100%;
      height: 44px;
      margin-top: 1.25rem;
      background: #1D9E75;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s, transform 0.1s;
      letter-spacing: 0.1px;
    }
    .submit-btn:hover:not(:disabled) {
      background: #158a61;
    }
    .submit-btn:active:not(:disabled) {
      transform: scale(0.98);
    }
    .submit-btn:disabled {
      background: #7ecfb2;
      cursor: not-allowed;
    }
    .card-footer {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e8ede9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer-copy {
      font-size: 11px;
      color: #9ab5a6;
    }
    .role-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      background: #e1f5ee;
      color: #0f6e56;
    }
  `],
  template: `
  <div class="login-bg">
    <div class="login-card">

      <!-- Brand -->
      <div class="brand">
        <img src="/upsomalogo.png" alt="Upsoma Restro" class="brand-logo">
        <div>
          <p class="brand-name">Upsoma Restro</p>
          <p class="brand-sub">Staff &amp; admin portal</p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Logout / suspend warning -->
      @if (logoutMessage()) {
        <div class="banner banner-warn">
          <span>⚠</span>
          <span>{{ logoutMessage() }}</span>
        </div>
      }

      <!-- Error banner -->
      @if (error()) {
        <div class="banner banner-err">
          <span>✕</span>
          <span>{{ error() }}</span>
        </div>
      }

      <!-- Form -->
     <form #loginForm="ngForm" (ngSubmit)="submit()">

  <div style="margin-bottom: 1rem;">
    <label class="field-label" for="email">
      <i class="fa-solid fa-user field-icon"></i>
      Email address
    </label>

    <input
      id="email"
      class="field-input"
      type="email"
      [(ngModel)]="email"
      name="email"
      placeholder="you@upsoma.in"
      required
      email
      autocomplete="username"
      #emailRef="ngModel"
    />
  </div>

  <div style="margin-bottom: 0.25rem;">
    <label class="field-label" for="password">
      <i class="fa-solid fa-key field-icon"></i>
      Password
    </label>

    <div class="pw-wrap">
      <input
        id="password"
        class="field-input"
        [type]="showPassword ? 'text' : 'password'"
        [(ngModel)]="password"
        name="password"
        placeholder="Enter your password"
        required
        minlength="6"
        autocomplete="current-password"
        #passwordRef="ngModel"
      />

      <button
        type="button"
        class="eye-btn"
        (click)="showPassword = !showPassword"
        [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
      >
        <i
          class="fa-solid"
          [ngClass]="showPassword ? 'fa-eye-slash' : 'fa-eye'"
        ></i>
      </button>
    </div>
  </div>

  <button
    type="submit"
    class="submit-btn"
    [disabled]="loading() || loginForm.invalid"
  >
    {{ loading() ? 'Signing in...' : 'Sign in' }}
  </button>

</form>

      <!-- Footer -->
      <div class="card-footer">
        <span class="footer-copy">Upsoma Restro OS &copy; 2026</span>
        <span class="role-pill">Staff &amp; Admin</span>
      </div>

    </div>
  </div>
  `
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = false;
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