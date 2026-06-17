import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shared marketing site footer with legal + section links. */
@Component({
  selector: 'mkt-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="mk-footer">
      <div class="mk-footer-inner">
        <div class="mk-foot-brand">
          <div class="mk-foot-brand-row">
            <span class="mk-logo-box" aria-hidden="true"></span>
            <span class="mk-foot-name">Upsoma Restro</span>
          </div>
          <p class="mk-foot-tag">
            The all-in-one QR ordering, kitchen, billing &amp; analytics platform
            for modern restaurants and cloud kitchens.
          </p>
        </div>

        <div class="mk-foot-col">
          <h4>Product</h4>
          <a routerLink="/" fragment="features">Features</a>
          <a routerLink="/" fragment="how">How it works</a>
          <a routerLink="/" fragment="pricing">Pricing</a>
          <a routerLink="/" fragment="faq">FAQ</a>
        </div>

        <div class="mk-foot-col">
          <h4>Company</h4>
          <a routerLink="/" fragment="contact">Book a Demo</a>
          <a routerLink="/login">Login</a>
          <a routerLink="/privacy-policy">Privacy Policy</a>
          <a routerLink="/terms">Terms &amp; Conditions</a>
        </div>

        <div class="mk-foot-col">
          <h4>Contact</h4>
          <a href="mailto:hello@upsomarestro.com">hello&#64;upsomarestro.com</a>
          <a href="tel:+919000000000">+91 90000 00000</a>
          <span class="mk-foot-addr">India</span>
        </div>
      </div>

      <div class="mk-foot-bottom">
        <span>© {{ year }} Upsoma Restro. All rights reserved.</span>
        <span class="mk-foot-legal">
          <a routerLink="/privacy-policy">Privacy</a>
          <span aria-hidden="true">·</span>
          <a routerLink="/terms">Terms</a>
        </span>
      </div>
    </footer>
  `,
  styles: [`
    .mk-footer { background: #16181d; color: #c7cad1; padding: 3.5rem 1.25rem 1.5rem; }
    .mk-footer-inner {
      max-width: 1180px; margin: 0 auto;
      display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 2.5rem;
    }
    .mk-foot-brand-row { display: flex; align-items: center; gap: .6rem; margin-bottom: .9rem; }
    .mk-logo-box {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, #e8542f, #ff7a4d); flex-shrink: 0;
    }
    .mk-foot-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1.1rem; color: #fff; }
    .mk-foot-tag { font-size: .9rem; line-height: 1.6; max-width: 340px; color: #9aa0ab; }
    .mk-foot-col { display: flex; flex-direction: column; gap: .6rem; }
    .mk-foot-col h4 {
      font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; color: #fff;
      margin: 0 0 .35rem;
    }
    .mk-foot-col a, .mk-foot-addr {
      color: #9aa0ab; text-decoration: none; font-size: .9rem; transition: color .15s;
    }
    .mk-foot-col a:hover { color: #ff7a4d; }
    .mk-foot-bottom {
      max-width: 1180px; margin: 2.5rem auto 0; padding-top: 1.5rem;
      border-top: 1px solid #2a2d35;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      font-size: .85rem; color: #7e8590; flex-wrap: wrap;
    }
    .mk-foot-legal { display: flex; gap: .6rem; }
    .mk-foot-legal a { color: #7e8590; text-decoration: none; }
    .mk-foot-legal a:hover { color: #ff7a4d; }
    @media (max-width: 860px) {
      .mk-footer-inner { grid-template-columns: 1fr 1fr; gap: 1.75rem; }
      .mk-foot-brand { grid-column: 1 / -1; }
    }
    @media (max-width: 520px) {
      .mk-footer-inner { grid-template-columns: 1fr; }
    }
  `]
})
export class MarketingFooterComponent {
  year = new Date().getFullYear();
}
