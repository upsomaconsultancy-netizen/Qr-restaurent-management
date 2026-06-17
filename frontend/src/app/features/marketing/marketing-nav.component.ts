import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shared marketing site top navigation. Logo area is intentionally left blank
 * (placeholder box) for the brand logo to be dropped in later.
 */
@Component({
  selector: 'mkt-nav',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="mk-nav" [class.scrolled]="true">
      <nav class="mk-nav-inner" aria-label="Primary">
        <a routerLink="/" class="mk-brand" aria-label="Upsoma Restro home">
          <!-- Blank logo placeholder — drop the brand logo image here -->
          <span class="mk-logo-box" aria-hidden="true"></span>
          <span class="mk-brand-name">Upsoma&nbsp;Restro</span>
        </a>

        <button
          class="mk-burger"
          [attr.aria-expanded]="open()"
          aria-label="Toggle navigation menu"
          (click)="open.set(!open())"
        >
          <span></span><span></span><span></span>
        </button>

        <div class="mk-links" [class.show]="open()">
          <a routerLink="/" fragment="features" (click)="open.set(false)">Features</a>
          <a routerLink="/" fragment="marketing" (click)="open.set(false)">Marketing</a>
          <a routerLink="/" fragment="how" (click)="open.set(false)">How it works</a>
          <a routerLink="/" fragment="pricing" (click)="open.set(false)">Pricing</a>
          <a routerLink="/" fragment="faq" (click)="open.set(false)">FAQ</a>
          <a routerLink="/" fragment="contact" (click)="open.set(false)">Contact</a>
          <a routerLink="/login" class="mk-login-btn" (click)="open.set(false)">Login</a>
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .mk-nav {
      position: sticky; top: 0; z-index: 100;
      background: rgba(255,255,255,.85);
      backdrop-filter: saturate(180%) blur(12px);
      border-bottom: 1px solid #efe9e3;
    }
    .mk-nav-inner {
      max-width: 1180px; margin: 0 auto; padding: .7rem 1.25rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    }
    .mk-brand { display: flex; align-items: center; gap: .6rem; text-decoration: none; }
    .mk-logo-box {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #fdeae3, #ffd9cb);
      border: 1px dashed #e8a98f; flex-shrink: 0;
    }
    .mk-brand-name {
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1.15rem; color: #16181d;
      letter-spacing: -.01em;
    }
    .mk-links { display: flex; align-items: center; gap: 1.5rem; }
    .mk-links > a {
      text-decoration: none; color: #45474d; font-weight: 500; font-size: .92rem;
      transition: color .15s;
    }
    .mk-links > a:hover { color: #e8542f; }
    .mk-login-btn {
      background: #16181d; color: #fff !important; padding: .5rem 1.2rem; border-radius: 999px;
      font-weight: 600 !important;
    }
    .mk-login-btn:hover { background: #e8542f; }
    .mk-burger {
      display: none; flex-direction: column; gap: 5px; background: none; border: none;
      cursor: pointer; padding: 6px;
    }
    .mk-burger span { width: 24px; height: 2px; background: #16181d; border-radius: 2px; }
    @media (max-width: 860px) {
      .mk-burger { display: flex; }
      .mk-links {
        position: absolute; top: 100%; left: 0; right: 0;
        flex-direction: column; align-items: stretch; gap: .25rem;
        background: #fff; border-bottom: 1px solid #efe9e3; padding: .75rem 1.25rem 1.25rem;
        box-shadow: 0 12px 24px rgba(0,0,0,.06);
        display: none;
      }
      .mk-links.show { display: flex; }
      .mk-links > a { padding: .65rem .25rem; border-bottom: 1px solid #f4efe9; }
      .mk-login-btn { text-align: center; margin-top: .5rem; }
    }
  `]
})
export class MarketingNavComponent {
  open = signal(false);
}
