import {
  Component, OnInit, AfterViewInit, inject, signal, PLATFORM_ID, ElementRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import { MarketingNavComponent } from './marketing-nav.component';
import { MarketingFooterComponent } from './marketing-footer.component';

interface Faq { q: string; a: string; }

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MarketingNavComponent, MarketingFooterComponent],
  template: `
    <mkt-nav></mkt-nav>

    <main class="lp" [class.js-anim]="animate()">
      <!-- ── Hero ── -->
      <section class="lp-hero">
        <div class="lp-hero-grid">
          <div class="lp-hero-copy">
            <span class="lp-eyebrow"><i class="fa-solid fa-bolt"></i> Complete Restaurant Operating System</span>
            <h1>
              <span class="brand">Upsoma Restro</span> —<br />
              The complete <span class="hl-1">Digital OS</span><br />
              for <span class="hl-2">Restaurants</span>
            </h1>
            <p class="lp-lede">
              Boost sales by up to <strong>40%</strong>, turn every order into a returning
              customer, and run your whole restaurant — <strong>QR ordering, kitchen, billing,
              receipts &amp; guest marketing</strong> — from one simple dashboard. No app for your guests.
            </p>
            <div class="lp-hero-cta">
              <a href="#contact" class="btn-ember"><i class="fa-solid fa-rocket"></i> Start 10-Day Free Trial</a>
              <a href="#how" class="btn-ghost"><i class="fa-solid fa-circle-play"></i> Watch 2-min Demo</a>
            </div>
            <div class="lp-social">
              <div class="lp-avatars" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>
              <div class="lp-social-txt">
                <strong>500+ Restaurants</strong>
                <span>Growing every day</span>
              </div>
              <div class="lp-rating">
                <div class="lp-stars">
                  <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                  <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                  <i class="fa-solid fa-star-half-stroke"></i>
                </div>
                <span>4.8 Rating</span>
              </div>
            </div>
          </div>

          <div class="lp-hero-art">
            <img class="lp-phone"
              src="qr1.webp"
              alt="Upsoma Restro QR menu on a phone — guests scan a table QR code to browse the menu and order"
              width="900" height="900" loading="eager" fetchpriority="high" />
            <div class="lp-float lp-float-1">
              <i class="fa-solid fa-circle-check"></i> Order Confirmed
            </div>
            <div class="lp-float lp-float-2">
              <span class="lp-float-stars">
                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
              </span>
              Popular Demand
            </div>
            <div class="lp-float lp-float-3">
              <i class="fa-solid fa-clock"></i> Live Tracking · Preparing · 8:42 left
            </div>
          </div>
        </div>
      </section>

      <!-- ── Stats bar ── -->
      <section class="lp-stats" aria-label="Key metrics">
        <div class="lp-stats-inner">
          <div><strong>40%</strong><span>Faster table turnover</span></div>
          <div><strong>20%</strong><span>More repeat visits</span></div>
          <div><strong>80%</strong><span>WhatsApp messages read &lt; 5 min</span></div>
          <div><strong>0</strong><span>Apps for guests to install</span></div>
        </div>
      </section>

      <!-- ── Signature feature: orders → marketing leads ── -->
      <section id="marketing" class="lp-signature reveal">
        <div class="lp-sig-grid">
          <div class="lp-sig-copy">
            <span class="lp-kicker light">What makes us different</span>
            <h2>Every order becomes your next customer</h2>
            <p class="lp-sig-lede">
              Ordinary QR menus take an order and forget the guest. Upsoma Restro
              <strong>remembers</strong> them. Each order saves the guest's
              <strong>name, mobile number, items and bill amount</strong> as a marketing lead.
              Later, win them back in their local area with offers over
              <strong>WhatsApp, RCS or SMS</strong> — where 80% of messages are read within
              five minutes. Loyal guests visit 20% more often and spend 20% more.
            </p>
            <div class="lp-sig-chips">
              <span><i class="fa-brands fa-whatsapp"></i> WhatsApp campaigns</span>
              <span><i class="fa-solid fa-comment-sms"></i> RCS &amp; SMS</span>
              <span><i class="fa-solid fa-location-dot"></i> Local-area targeting</span>
              <span><i class="fa-solid fa-rotate-left"></i> Win-back offers</span>
            </div>
          </div>
          <div class="lp-sig-card">
            <div class="lp-sig-card-row"><span class="lp-sig-dot"></span> Order #1042 · ₹640 · Rohan</div>
            <div class="lp-sig-card-row"><span class="lp-sig-dot"></span> Saved to guest list · 98765·····</div>
            <div class="lp-sig-card-arrow"><i class="fa-solid fa-arrow-down-long"></i></div>
            <div class="lp-sig-card-msg">
              <i class="fa-brands fa-whatsapp"></i>
              “Hi Rohan! 🍕 Missing us? Get 20% off your favourite Pizza this weekend at Upsoma — reply YES to order.”
            </div>
            <div class="lp-sig-card-sent">Sent via WhatsApp · Local campaign</div>
          </div>
        </div>
      </section>

      <!-- ── Features ── -->
      <section id="features" class="lp-section">
        <div class="lp-head reveal">
          <span class="lp-kicker">Everything you need</span>
          <h2>One platform for the whole restaurant</h2>
          <p>From the guest's first scan to the manager's end-of-day report — every step is connected.</p>
        </div>
        <div class="lp-feat-grid">
          @for (f of features; track f.title) {
            <article class="lp-feat-card reveal">
              <div class="lp-feat-ico" [style.background]="f.bg" [style.color]="f.fg">
                <i class="fa-solid {{ f.icon }}"></i>
              </div>
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
            </article>
          }
        </div>
      </section>

      <!-- ── How it works ── -->
      <section id="how" class="lp-section lp-section-alt">
        <div class="lp-head reveal">
          <span class="lp-kicker">Simple by design</span>
          <h2>Live in four easy steps</h2>
        </div>
        <div class="lp-steps">
          @for (s of steps; track s.n) {
            <div class="lp-step reveal">
              <div class="lp-step-n"><i class="fa-solid {{ s.icon }}"></i></div>
              <span class="lp-step-tag">Step {{ s.n }}</span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.desc }}</p>
            </div>
          }
        </div>
      </section>

      <!-- ── Showcase / benefit ── -->
      <section class="lp-showcase">
        <div class="lp-showcase-grid">
          <div class="lp-showcase-art reveal">
            <img src="qr1.webp"
              alt="Digital QR menu showing categories and dishes a guest can order from their table"
              width="900" height="900" loading="lazy" />
          </div>
          <div class="lp-showcase-copy reveal">
            <span class="lp-kicker">Built for owners</span>
            <h2>See every outlet, in real time</h2>
            <p>
              Track live orders, revenue, peak hours, best-selling items and staff cash
              collection across all your branches from a single dashboard — on desktop or mobile.
            </p>
            <ul class="lp-check">
              <li><i class="fa-solid fa-circle-check"></i> Live kitchen &amp; waiter displays update instantly</li>
              <li><i class="fa-solid fa-circle-check"></i> Guests generate their own GST receipt &amp; rate you</li>
              <li><i class="fa-solid fa-circle-check"></i> Inventory auto-deducts from recipes on every order</li>
              <li><i class="fa-solid fa-circle-check"></i> Per-outlet &amp; consolidated sales analytics</li>
            </ul>
            <a href="#contact" class="btn-ember"><i class="fa-solid fa-calendar-check"></i> Get a personalised demo</a>
          </div>
        </div>
      </section>

      <!-- ── Why QR ordering (infographic) ── -->
      <section class="lp-why">
        <div class="lp-head reveal">
          <span class="lp-kicker">Why it works</span>
          <h2>Why set up a QR ordering system?</h2>
          <p>The benefits add up fast — for your guests and your bottom line.</p>
        </div>
        <div class="lp-why-img reveal">
          <img src="qr2.jpg"
            alt="Benefits of a QR code ordering system — higher ordering efficiency, better customer experience, order accuracy, more sales, order analytics and easy menu updates"
            width="600" height="560" loading="lazy" />
        </div>
      </section>

      <!-- ── Pricing ── -->
      <section id="pricing" class="lp-section">
        <div class="lp-head reveal">
          <span class="lp-kicker">Transparent pricing</span>
          <h2>Pay per table. Nothing more.</h2>
          <p>No platform fee and no per-restaurant charge — start with a 10-day free trial and only pay for the tables you use.</p>
        </div>

        <div class="lp-trial-banner reveal">
          <span class="lp-trial-emoji"><i class="fa-solid fa-gift"></i></span>
          <div>
            <strong>10 days free</strong>
            <span>Full access, no card required. There's no charge for the whole restaurant — billing is simply per table.</span>
          </div>
        </div>

        <div class="lp-price-grid">
          @for (p of plans; track p.name) {
            <article class="lp-price-card reveal" [class.featured]="p.featured">
              @if (p.featured) { <span class="lp-price-badge">Most popular</span> }
              <div class="lp-price-seats"><i class="fa-solid fa-chair"></i> {{ p.seats }}</div>
              <h3>{{ p.name }}</h3>
              <div class="lp-price-amt"><span class="cur">₹</span>{{ p.price }}<span class="per">{{ p.unit }}</span></div>
              <p class="lp-price-sub">{{ p.sub }}</p>
              <ul>
                @for (feat of p.feats; track feat) { <li><i class="fa-solid fa-check"></i> {{ feat }}</li> }
              </ul>
              <a href="#contact" class="btn-ember w-full">{{ p.cta }}</a>
            </article>
          }

          <!-- Home delivery — coming-soon add-on -->
          <article class="lp-price-card lp-price-soon reveal">
            <span class="lp-soon-badge">Coming soon</span>
            <div class="lp-price-seats"><i class="fa-solid fa-motorcycle"></i> Add-on</div>
            <h3>Home Delivery</h3>
            <div class="lp-price-amt lp-price-amt-soon">+ delivery<span class="per"> pricing soon</span></div>
            <p class="lp-price-sub">Accept delivery orders and manage them right alongside dine-in &amp; takeaway.</p>
            <ul>
              <li><i class="fa-solid fa-motorcycle"></i> Delivery order flow</li>
              <li><i class="fa-solid fa-location-dot"></i> Reach your local area</li>
              <li><i class="fa-solid fa-bell"></i> We'll notify you at launch</li>
            </ul>
            <a href="#contact" class="btn-ghost w-full">Get notified</a>
          </article>
        </div>
      </section>

      <!-- ── FAQ (AEO: FAQPage schema) ── -->
      <section id="faq" class="lp-section lp-section-alt">
        <div class="lp-head reveal">
          <span class="lp-kicker">Questions, answered</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div class="lp-faq reveal">
          @for (f of faqs; track f.q; let i = $index) {
            <div class="lp-faq-item" [class.open]="openFaq() === i">
              <button class="lp-faq-q" [attr.aria-expanded]="openFaq() === i" (click)="toggleFaq(i)">
                <span>{{ f.q }}</span>
                <i class="fa-solid fa-chevron-down lp-faq-chev" aria-hidden="true"></i>
              </button>
              @if (openFaq() === i) {
                <div class="lp-faq-a">{{ f.a }}</div>
              }
            </div>
          }
        </div>
      </section>

      <!-- ── Contact / Book a Demo ── -->
      <section id="contact" class="lp-contact">
        <div class="lp-contact-grid">
          <div class="lp-contact-copy reveal">
            <span class="lp-kicker light">Let's talk</span>
            <h2>Book your free demo</h2>
            <p>
              Tell us a little about your restaurant and our team will set you up with a
              personalised walkthrough — usually within one business day.
            </p>
            <ul class="lp-contact-points">
              <li><i class="fa-solid fa-phone-volume"></i> No-obligation 20-minute demo</li>
              <li><i class="fa-solid fa-utensils"></i> Tailored to your menu &amp; outlets</li>
              <li><i class="fa-solid fa-handshake-angle"></i> Dedicated onboarding support</li>
            </ul>
          </div>

          <form class="lp-form reveal" (ngSubmit)="submit()" #demoForm="ngForm" novalidate>
            <h3>Request a demo</h3>

            <label class="lp-field">
              <span>Full name <i>*</i></span>
              <input name="name" [(ngModel)]="lead.name" required minlength="2"
                placeholder="e.g. Rohan Mehta" autocomplete="name" />
            </label>

            <label class="lp-field">
              <span>Phone number <i>*</i></span>
              <input name="phone" [(ngModel)]="lead.phone" required
                placeholder="e.g. 98765 43210" autocomplete="tel" inputmode="tel" />
            </label>

            <label class="lp-field">
              <span>Email <small>(optional)</small></span>
              <input name="email" [(ngModel)]="lead.email" type="email"
                placeholder="you@restaurant.com" autocomplete="email" />
            </label>

            <label class="lp-field">
              <span>Restaurant address <i>*</i></span>
              <input name="address" [(ngModel)]="lead.address" required
                placeholder="Outlet name, area, city" autocomplete="street-address" />
            </label>

            <label class="lp-field">
              <span>Message <small>(optional)</small></span>
              <textarea name="message" [(ngModel)]="lead.message" rows="2"
                placeholder="Number of outlets, what you'd like to see…"></textarea>
            </label>

            @if (formMsg()) {
              <div class="lp-form-msg" [class.ok]="formOk()" [class.err]="!formOk()">
                {{ formMsg() }}
              </div>
            }

            <button type="submit" class="btn-ember w-full"
              [disabled]="submitting() || !demoForm.form.valid">
              <i class="fa-solid fa-paper-plane"></i>
              {{ submitting() ? 'Sending…' : 'Book a Demo' }}
            </button>
            <p class="lp-form-fine">
              By submitting you agree to our
              <a routerLink="/privacy-policy">Privacy Policy</a> and
              <a routerLink="/terms">Terms</a>.
            </p>
          </form>
        </div>
      </section>
    </main>

    <mkt-footer></mkt-footer>
  `,
  styles: [`
    :host { display: block; background: #fbf9f6; color: #16181d; }
    .lp { overflow-x: hidden; }
    h1, h2, h3 { font-family: 'Sora', sans-serif; letter-spacing: -.02em; }

    .btn-ember {
      display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
      background: #e8542f; color: #fff; text-decoration: none;
      padding: .85rem 1.5rem; border-radius: 999px; font-weight: 600; border: none;
      cursor: pointer; transition: transform .15s, box-shadow .15s, background .15s;
      box-shadow: 0 8px 20px rgba(232,84,47,.25); font-size: .98rem;
    }
    .btn-ember:hover:not(:disabled) { background: #cf4423; transform: translateY(-2px); box-shadow: 0 12px 26px rgba(232,84,47,.32); }
    .btn-ember:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
    .btn-ghost {
      display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
      background: #fff; color: #16181d; text-decoration: none;
      padding: .85rem 1.5rem; border-radius: 999px; font-weight: 600;
      border: 1px solid #e3dcd3; transition: border-color .15s, color .15s, transform .15s; font-size: .98rem;
    }
    .btn-ghost:hover { border-color: #e8542f; color: #e8542f; transform: translateY(-2px); }
    .w-full { width: 100%; }

    /* Entrance + scroll-reveal animations (only when JS is active, so no-JS shows everything) */
    @keyframes lpFadeUp { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
    @keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
    .js-anim .reveal { opacity: 0; transform: translateY(26px); transition: opacity .6s ease, transform .6s ease; }
    .js-anim .reveal.in { opacity: 1; transform: none; }
    @media (prefers-reduced-motion: reduce) {
      .js-anim .reveal { opacity: 1 !important; transform: none !important; transition: none; }
      .lp-hero-copy > *, .lp-phone, .lp-float { animation: none !important; }
    }

    /* Hero */
    .lp-hero { max-width: 1180px; margin: 0 auto; padding: 3.5rem 1.25rem 3rem; }
    .lp-hero-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 3rem; align-items: center; }
    .lp-hero-copy > * { animation: lpFadeUp .7s ease both; }
    .lp-hero-copy .lp-eyebrow { animation-delay: .02s; }
    .lp-hero-copy h1 { animation-delay: .1s; }
    .lp-hero-copy .lp-lede { animation-delay: .2s; }
    .lp-hero-copy .lp-hero-cta { animation-delay: .3s; }
    .lp-hero-copy .lp-social { animation-delay: .4s; }
    .lp-eyebrow {
      display: inline-flex; align-items: center; gap: .45rem; background: #fdeae3; color: #b83a1a;
      font-weight: 600; font-size: .82rem; padding: .4rem .9rem; border-radius: 999px; margin-bottom: 1.1rem;
    }
    .lp-hero-copy h1 { font-size: clamp(2.1rem, 4.4vw, 3.4rem); line-height: 1.1; margin: 0 0 1.1rem; }
    .lp-hero-copy h1 .brand { color: #16181d; }
    .lp-hero-copy h1 .hl-1 { color: #1d9a8a; }
    .lp-hero-copy h1 .hl-2 { color: #2563eb; }
    .lp-lede { font-size: 1.06rem; line-height: 1.65; color: #50535b; max-width: 44ch; margin: 0 0 1.6rem; }
    .lp-lede strong { color: #16181d; }
    .lp-hero-cta { display: flex; gap: .8rem; flex-wrap: wrap; margin-bottom: 1.6rem; }
    .lp-social { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
    .lp-avatars { display: flex; }
    .lp-avatars span {
      width: 34px; height: 34px; border-radius: 50%; border: 2px solid #fff; margin-left: -10px;
      background: linear-gradient(135deg, #ffb59c, #e8542f);
    }
    .lp-avatars span:first-child { margin-left: 0; background: linear-gradient(135deg, #9ad9cf, #1d9a8a); }
    .lp-avatars span:nth-child(3) { background: linear-gradient(135deg, #a9c7ff, #2563eb); }
    .lp-social-txt strong { display: block; font-size: .92rem; }
    .lp-social-txt span { font-size: .8rem; color: #65686f; }
    .lp-rating { display: flex; flex-direction: column; }
    .lp-stars, .lp-float-stars { color: #f5a623; font-size: .82rem; }
    .lp-rating > span { font-size: .8rem; color: #5a5d64; font-weight: 600; }

    .lp-hero-art { position: relative; display: flex; justify-content: center; }
    .lp-phone {
      width: 100%; max-width: 460px; height: auto; display: block;
      animation: lpFadeUp .8s ease both .25s;
      filter: drop-shadow(0 24px 50px rgba(20,22,30,.18));
    }
    .lp-float {
      position: absolute; background: #fff; border-radius: 12px; padding: .55rem .85rem;
      font-size: .8rem; font-weight: 600; box-shadow: 0 12px 30px rgba(20,22,30,.16);
      display: inline-flex; align-items: center; gap: .45rem; animation: lpFloat 4s ease-in-out infinite;
    }
    .lp-float i { font-size: .95rem; }
    .lp-float-1 { top: 6%; left: 0; color: #1d9a8a; animation-delay: .2s; }
    .lp-float-1 i { color: #1d9a8a; }
    .lp-float-2 { top: 34%; right: -6px; color: #16181d; flex-direction: column; align-items: flex-start; gap: .15rem; animation-delay: 1.1s; }
    .lp-float-3 { bottom: 7%; left: 4%; color: #c0431f; animation-delay: .6s; }
    .lp-float-3 i { color: #c0431f; }

    /* Stats */
    .lp-stats { background: #16181d; }
    .lp-stats-inner {
      max-width: 1180px; margin: 0 auto; padding: 1.6rem 1.25rem;
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;
    }
    .lp-stats-inner div { color: #cfd2d8; }
    .lp-stats-inner strong { display: block; font-family: 'Sora', sans-serif; font-size: 1.7rem; color: #fff; }
    .lp-stats-inner span { font-size: .82rem; }

    /* Signature feature */
    .lp-signature { background: linear-gradient(135deg, #2a1410 0%, #3a1c14 55%, #16181d 100%); }
    .lp-sig-grid {
      max-width: 1180px; margin: 0 auto; padding: 4.5rem 1.25rem;
      display: grid; grid-template-columns: 1.1fr .9fr; gap: 3rem; align-items: center;
    }
    .lp-sig-copy h2 { color: #fff; font-size: clamp(1.8rem, 3.4vw, 2.5rem); margin: .5rem 0 1rem; }
    .lp-sig-lede { color: #d9cbc4; line-height: 1.75; font-size: 1.05rem; margin: 0 0 1.4rem; }
    .lp-sig-lede strong { color: #ffb59c; }
    .lp-sig-chips { display: flex; flex-wrap: wrap; gap: .6rem; }
    .lp-sig-chips span {
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
      color: #f1e7e2; font-size: .85rem; font-weight: 500; padding: .45rem .85rem; border-radius: 999px;
      display: inline-flex; align-items: center; gap: .4rem;
    }
    .lp-sig-chips .fa-whatsapp { color: #25d366; }
    .lp-sig-card { background: #fff; border-radius: 18px; padding: 1.5rem; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
    .lp-sig-card-row {
      display: flex; align-items: center; gap: .6rem; font-size: .9rem; font-weight: 600;
      color: #2c2f36; padding: .55rem .7rem; background: #f7f3ef; border-radius: 10px; margin-bottom: .55rem;
    }
    .lp-sig-dot { width: 9px; height: 9px; border-radius: 50%; background: #1d7a4f; flex-shrink: 0; }
    .lp-sig-card-arrow { text-align: center; color: #e8542f; font-size: 1.1rem; margin: .25rem 0; }
    .lp-sig-card-msg {
      background: #e7f6ee; border: 1px solid #c6ebd6; border-radius: 12px; padding: .85rem 1rem;
      color: #14543a; font-size: .92rem; line-height: 1.55;
    }
    .lp-sig-card-msg .fa-whatsapp { color: #25d366; margin-right: .25rem; }
    .lp-sig-card-sent { color: #65686f; font-size: .78rem; text-align: right; margin-top: .5rem; }

    /* Sections */
    .lp-section { max-width: 1180px; margin: 0 auto; padding: 4.5rem 1.25rem; }
    .lp-section-alt { max-width: none; background: #f3efe9; }
    .lp-section-alt > * { max-width: 1180px; margin-left: auto; margin-right: auto; }
    .lp-head { text-align: center; max-width: 640px; margin: 0 auto 2.75rem; }
    .lp-kicker { text-transform: uppercase; letter-spacing: .08em; font-size: .78rem; font-weight: 700; color: #b83a1a; }
    .lp-kicker.light { color: #ffd9cb; }
    .lp-head h2 { font-size: clamp(1.7rem, 3.2vw, 2.4rem); margin: .5rem 0 .6rem; }
    .lp-head p { color: #5a5d64; font-size: 1.02rem; line-height: 1.6; margin: 0; }

    /* Feature grid */
    .lp-feat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
    .lp-feat-card {
      background: #fff; border: 1px solid #efe9e3; border-radius: 16px; padding: 1.6rem;
      transition: transform .18s, box-shadow .18s, border-color .18s;
    }
    .lp-feat-card:hover { transform: translateY(-5px); box-shadow: 0 18px 40px rgba(20,22,30,.1); border-color: #f3c9b9; }
    .lp-feat-ico {
      width: 52px; height: 52px; border-radius: 13px; display: grid; place-items: center;
      font-size: 1.35rem; margin-bottom: 1rem;
    }
    .lp-feat-card h3 { font-size: 1.1rem; margin: 0 0 .45rem; }
    .lp-feat-card p { color: #5a5d64; font-size: .92rem; line-height: 1.6; margin: 0; }

    /* Steps */
    .lp-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
    .lp-step { background: #fff; border-radius: 16px; padding: 1.5rem; border: 1px solid #efe9e3; transition: transform .18s, box-shadow .18s; }
    .lp-step:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgba(20,22,30,.08); }
    .lp-step-n {
      width: 44px; height: 44px; border-radius: 12px; background: #16181d; color: #fff;
      font-size: 1.15rem; display: grid; place-items: center; margin-bottom: .8rem;
    }
    .lp-step-tag { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #e8542f; }
    .lp-step h3 { font-size: 1.05rem; margin: .25rem 0 .4rem; }
    .lp-step p { color: #5a5d64; font-size: .92rem; line-height: 1.55; margin: 0; }

    /* Why QR ordering (infographic) */
    .lp-why { max-width: 1180px; margin: 0 auto; padding: 4.5rem 1.25rem; }
    .lp-why-img { display: flex; justify-content: center; }
    .lp-why-img img {
      width: 100%; max-width: 560px; height: auto; border-radius: 18px;
      box-shadow: 0 18px 44px rgba(20,22,30,.12); border: 1px solid #efe9e3; background: #fff;
    }

    /* Showcase */
    .lp-showcase { background: #fff; }
    .lp-showcase-grid {
      max-width: 1180px; margin: 0 auto; padding: 4.5rem 1.25rem;
      display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;
    }
    .lp-showcase-art { display: flex; justify-content: center; background: linear-gradient(135deg,#fdf3ee,#f7efe8); border-radius: 20px; padding: 1.5rem; }
    .lp-showcase-art img { width: 100%; max-width: 360px; height: auto; filter: drop-shadow(0 18px 40px rgba(20,22,30,.16)); }
    .lp-showcase-copy h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); margin: .5rem 0 .8rem; }
    .lp-showcase-copy p { color: #5a5d64; line-height: 1.65; margin: 0 0 1.2rem; }
    .lp-check { list-style: none; padding: 0; margin: 0 0 1.6rem; display: grid; gap: .7rem; }
    .lp-check li { display: flex; align-items: flex-start; gap: .55rem; color: #2c2f36; font-size: .96rem; }
    .lp-check li i { color: #1d7a4f; margin-top: .15rem; }

    /* Pricing */
    .lp-price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; align-items: stretch; }
    .lp-price-card {
      position: relative; background: #fff; border: 1px solid #efe9e3; border-radius: 18px;
      padding: 2rem 1.6rem; display: flex; flex-direction: column; transition: transform .18s, box-shadow .18s;
    }
    .lp-price-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(20,22,30,.1); }
    .lp-price-card.featured { border-color: #e8542f; box-shadow: 0 18px 44px rgba(232,84,47,.16); }
    .lp-price-badge {
      position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
      background: #e8542f; color: #fff; font-size: .72rem; font-weight: 700;
      padding: .3rem .8rem; border-radius: 999px; text-transform: uppercase; letter-spacing: .05em;
    }
    .lp-price-seats { font-size: .8rem; font-weight: 600; color: #1d9a8a; display: inline-flex; align-items: center; gap: .4rem; margin-bottom: .5rem; }
    .lp-price-card h3 { font-size: 1.15rem; margin: 0 0 .5rem; }
    .lp-price-amt { font-family: 'Sora', sans-serif; font-size: 2.4rem; font-weight: 700; line-height: 1; }
    .lp-price-amt .cur { font-size: 1.2rem; vertical-align: super; }
    .lp-price-amt .per { font-size: .9rem; color: #65686f; font-weight: 500; white-space: nowrap; }
    .lp-price-sub { color: #5a5d64; font-size: .9rem; margin: .5rem 0 1.1rem; }
    .lp-price-card ul { list-style: none; padding: 0; margin: 0 0 1.5rem; display: grid; gap: .55rem; flex: 1; }
    .lp-price-card li { font-size: .92rem; color: #2c2f36; display: flex; align-items: flex-start; gap: .5rem; }
    .lp-price-card li i { color: #1d7a4f; margin-top: .2rem; font-size: .8rem; }

    .lp-trial-banner {
      max-width: 760px; margin: 0 auto 2.25rem; background: #14543a;
      border-radius: 16px; padding: 1.1rem 1.4rem; display: flex; align-items: center; gap: 1rem; color: #fff;
    }
    .lp-trial-emoji { font-size: 1.5rem; }
    .lp-trial-banner strong { display: block; font-family: 'Sora', sans-serif; font-size: 1.15rem; }
    .lp-trial-banner span { display: block; color: #c6ebd6; font-size: .9rem; line-height: 1.5; margin-top: .15rem; }

    .lp-price-soon { background: #faf6f2; border-style: dashed; border-color: #e3d6cb; }
    .lp-price-soon .lp-price-seats { color: #a98c7c; }
    .lp-soon-badge {
      position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
      background: #16181d; color: #fff; font-size: .72rem; font-weight: 700;
      padding: .3rem .8rem; border-radius: 999px; text-transform: uppercase; letter-spacing: .05em;
    }
    .lp-price-amt-soon { font-size: 1.6rem; color: #8a5a45; }
    .lp-price-amt-soon .per { font-size: .9rem; color: #a98c7c; }
    .lp-price-soon li i { color: #b98a4a; }

    /* FAQ */
    .lp-faq { max-width: 760px; margin: 0 auto; display: grid; gap: .8rem; }
    .lp-faq-item { background: #fff; border: 1px solid #efe9e3; border-radius: 12px; overflow: hidden; }
    .lp-faq-item.open { border-color: #f3c9b9; }
    .lp-faq-q {
      width: 100%; background: none; border: none; cursor: pointer; text-align: left;
      padding: 1.1rem 1.25rem; font-size: 1rem; font-weight: 600; color: #16181d;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-family: 'Sora', sans-serif;
    }
    .lp-faq-chev { transition: transform .2s; font-size: .9rem; color: #e8542f; }
    .lp-faq-item.open .lp-faq-chev { transform: rotate(180deg); }
    .lp-faq-a { padding: 0 1.25rem 1.2rem; color: #5a5d64; line-height: 1.65; font-size: .95rem; }

    /* Contact */
    .lp-contact { background: #16181d; }
    .lp-contact-grid {
      max-width: 1180px; margin: 0 auto; padding: 4.5rem 1.25rem;
      display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;
    }
    .lp-contact-copy h2 { color: #fff; font-size: clamp(1.7rem, 3vw, 2.3rem); margin: .5rem 0 .8rem; }
    .lp-contact-copy p { color: #b6bac2; line-height: 1.65; margin: 0 0 1.3rem; max-width: 42ch; }
    .lp-contact-points { list-style: none; padding: 0; margin: 0; display: grid; gap: .7rem; }
    .lp-contact-points li { color: #d7dae0; font-size: .96rem; display: flex; align-items: center; gap: .6rem; }
    .lp-contact-points li i { color: #ff7a4d; width: 1.2rem; text-align: center; }

    .lp-form { background: #fff; border-radius: 18px; padding: 1.9rem; box-shadow: 0 24px 60px rgba(0,0,0,.3); }
    .lp-form h3 { margin: 0 0 1.2rem; font-size: 1.25rem; }
    .lp-field { display: block; margin-bottom: .9rem; }
    .lp-field > span { display: block; font-size: .86rem; font-weight: 600; margin-bottom: .35rem; color: #2c2f36; }
    .lp-field > span i { color: #e8542f; font-style: normal; }
    .lp-field > span small { color: #65686f; font-weight: 500; }
    .lp-field input, .lp-field textarea {
      width: 100%; padding: .7rem .85rem; border: 1px solid #e3dcd3; border-radius: 10px;
      font-size: .95rem; font-family: inherit; color: #16181d; transition: border-color .15s, box-shadow .15s;
      box-sizing: border-box;
    }
    .lp-field input:focus, .lp-field textarea:focus { outline: none; border-color: #e8542f; box-shadow: 0 0 0 3px rgba(232,84,47,.12); }
    .lp-field textarea { resize: vertical; }
    .lp-form-msg { padding: .7rem .85rem; border-radius: 10px; font-size: .88rem; margin-bottom: .9rem; }
    .lp-form-msg.ok { background: #e7f6ee; color: #136a43; }
    .lp-form-msg.err { background: #fde7e7; color: #a31515; }
    .lp-form-fine { font-size: .78rem; color: #65686f; margin: .8rem 0 0; text-align: center; }
    .lp-form-fine a { color: #e8542f; text-decoration: none; }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .lp-feat-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 940px) {
      .lp-hero-grid, .lp-showcase-grid, .lp-contact-grid, .lp-sig-grid { grid-template-columns: 1fr; }
      .lp-hero-art { order: -1; }
      .lp-hero-copy { text-align: center; }
      .lp-lede { margin-left: auto; margin-right: auto; }
      .lp-hero-cta, .lp-social { justify-content: center; }
      .lp-steps { grid-template-columns: repeat(2, 1fr); }
      .lp-price-grid { grid-template-columns: 1fr; max-width: 460px; margin-left: auto; margin-right: auto; }
      .lp-stats-inner { grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    }
    @media (max-width: 760px) {
      .lp-feat-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 560px) {
      .lp-hero { padding-top: 2.25rem; }
      .lp-feat-grid, .lp-steps { grid-template-columns: 1fr; }
      .lp-section { padding: 3.25rem 1.25rem; }
      .lp-sig-grid, .lp-showcase-grid, .lp-contact-grid { padding: 3.25rem 1.25rem; }
      .lp-hero-cta .btn-ember, .lp-hero-cta .btn-ghost { width: 100%; }
      .lp-form { padding: 1.4rem; }
      .lp-float { font-size: .72rem; padding: .45rem .65rem; }
      .lp-float-2 { right: 0; }
    }
    @media (max-width: 380px) {
      .lp-stats-inner { grid-template-columns: 1fr 1fr; }
      .lp-social { gap: .85rem; }
    }
  `]
})
export class LandingComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);
  private host = inject(ElementRef<HTMLElement>);

  animate = signal(false);
  openFaq = signal<number>(0);
  submitting = signal(false);
  formMsg = signal<string>('');
  formOk = signal(false);

  lead = { name: '', phone: '', email: '', address: '', message: '' };

  features = [
    { icon: 'fa-qrcode', bg: '#fdeae3', fg: '#c0431f', title: 'QR Self-Ordering', desc: 'Guests scan a table QR, browse your menu and order — no app, no waiting for a waiter.' },
    { icon: 'fa-bell-concierge', bg: '#e3edff', fg: '#1b4ea8', title: 'Live Kitchen Display', desc: 'Orders stream to the kitchen in real time with a clear Pending → Preparing → Ready flow.' },
    { icon: 'fa-receipt', bg: '#e7f6ee', fg: '#136a43', title: 'Self-Serve Receipts', desc: 'Guests generate and download their own GST bill the moment they pay — no waiting on staff.' },
    { icon: 'fa-star', bg: '#fff3d6', fg: '#9a6b00', title: 'Ratings & Reviews', desc: 'After paying, customers can rate your restaurant and leave feedback so you keep improving.' },
    { icon: 'fa-boxes-stacked', bg: '#efe3ff', fg: '#6a3bbf', title: 'Smart Inventory', desc: 'Stock auto-deducts from recipes on every order, with low-stock and wastage alerts.' },
    { icon: 'fa-chart-line', bg: '#e3f6ff', fg: '#0e6f9a', title: 'Powerful Analytics', desc: 'Sales trends, peak hours, best & worst sellers and staff performance at a glance.' },
    { icon: 'fa-store', bg: '#ffe3ee', fg: '#bf2f6a', title: 'Multi-Outlet Ready', desc: 'Manage many branches under one account with per-outlet menus and consolidated reports.' },
    { icon: 'fa-bullhorn', bg: '#e7f6ee', fg: '#1d7a4f', title: 'Guest Marketing Leads', desc: 'Every order saves the guest as a lead so you can win them back via WhatsApp, RCS or SMS.' },
  ];

  steps = [
    { n: 1, icon: 'fa-headset', title: 'We onboard you', desc: 'Share your menu and outlets — we set everything up for you.' },
    { n: 2, icon: 'fa-qrcode', title: 'Print your QR codes', desc: 'Place a unique QR on every table and at the counter.' },
    { n: 3, icon: 'fa-mobile-screen-button', title: 'Guests scan & order', desc: 'Customers scan, order and track their food in real time.' },
    { n: 4, icon: 'fa-chart-pie', title: 'You run the show', desc: 'Kitchen, billing, receipts and analytics — all from one dashboard.' },
  ];

  plans = [
    { name: 'Standard Table', seats: 'Up to 4 seats', price: '349', unit: ' /table·mo', sub: 'Perfect for regular dine-in tables.', featured: true, cta: 'Start 10-day free trial',
      feats: ['QR ordering & digital menu', 'Live kitchen display', 'Self-serve receipts & ratings', 'Guest marketing leads', 'Up to 4 seats per table'] },
    { name: 'Family Table', seats: 'Up to 6 seats', price: '399', unit: ' /table·mo', sub: 'For larger group & family tables.', featured: false, cta: 'Start 10-day free trial',
      feats: ['Everything in Standard Table', 'For 6-seat family tables', 'Same full feature set', 'No per-restaurant fee'] },
  ];

  faqs: Faq[] = [
    { q: 'How does Upsoma turn orders into marketing leads?', a: 'Every time a guest orders through a table QR code, we save their name, mobile number, ordered items and bill amount as a marketing lead for your restaurant. You can then re-engage those guests in your local area with offers and reminders over WhatsApp, RCS or SMS — and since 80% of WhatsApp messages are read within five minutes, win-backs actually work.' },
    { q: 'How much does it cost?', a: 'You start with a 10-day free trial with no card required. After that there is no per-restaurant fee — you simply pay per table: ₹349 per table per month for tables of up to 4 seats, and ₹399 per table per month for 6-seat family tables. Home delivery is a separate add-on coming soon.' },
    { q: 'Can guests get their own bill and rate us?', a: 'Yes. The moment a guest pays, they can generate and download their own GST receipt from their phone — no waiting on staff — and then rate your restaurant and leave feedback, helping you collect reviews and improve.' },
    { q: 'Do my customers need to download an app?', a: 'No. Guests simply scan the QR code on their table with any phone camera and the menu opens in the browser — they can order instantly without installing anything.' },
    { q: 'How long does it take to go live?', a: 'Most restaurants are up and running within 24 hours. We help you import your menu, configure outlets and generate table QR codes during onboarding.' },
    { q: 'Can I manage more than one outlet?', a: 'Yes. Upsoma Restro is multi-tenant and multi-outlet by design. You can run several branches under one account with per-outlet menus, staff and consolidated analytics.' },
    { q: 'Is the kitchen display real-time?', a: 'Yes. Orders appear on the kitchen and waiter displays instantly over a real-time connection, so nothing is missed.' },
    { q: 'How is my data kept secure?', a: 'Each restaurant is fully isolated, access is role-based (owner, manager, waiter, kitchen) and prices are always validated on the server. We follow standard security best practices.' },
  ];

  ngOnInit(): void {
    this.seo.apply({
      title: 'Upsoma Restro — QR Ordering, Kitchen, Billing & Guest Marketing for Restaurants',
      description: 'Upsoma Restro turns every order into a marketing lead — capture guest name, number & items, then win them back via WhatsApp, RCS or SMS. Plus QR self-ordering, kitchen display, self-serve receipts, ratings & analytics. 10-day free trial, pay per table.',
      path: '/',
      keywords: 'restaurant QR ordering, QR menu, restaurant customer marketing, WhatsApp marketing for restaurants, RCS SMS restaurant campaigns, kitchen display system, restaurant billing software, self-serve receipt, restaurant management system, per table pricing, cloud kitchen software, Upsoma Restro',
    });
    this.injectStructuredData();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Enable reveal animations only in the browser, so the no-JS / SSR render
    // shows all content (good for SEO & accessibility). The [class.js-anim]
    // binding applies the initial hidden state once this flips true.
    this.animate.set(true);

    const els = this.host.nativeElement.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el: Element) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el: Element) => io.observe(el));
  }

  toggleFaq(i: number): void {
    this.openFaq.set(this.openFaq() === i ? -1 : i);
  }

  submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.formMsg.set('');
    const payload = {
      name: this.lead.name.trim(),
      phone: this.lead.phone.trim(),
      email: this.lead.email.trim() || undefined,
      address: this.lead.address.trim(),
      message: this.lead.message.trim() || undefined,
    };
    this.api.post<{ id: string }>('/public/leads', payload).subscribe({
      next: () => {
        this.formOk.set(true);
        this.formMsg.set('Thanks! Our team will reach out to schedule your demo shortly.');
        this.lead = { name: '', phone: '', email: '', address: '', message: '' };
        this.submitting.set(false);
      },
      error: (e) => {
        this.formOk.set(false);
        this.formMsg.set(e?.error?.message || 'Something went wrong. Please try again.');
        this.submitting.set(false);
      },
    });
  }

  /** SEO + AEO + GEO: rich structured data for search & answer engines. */
  private injectStructuredData(): void {
    const origin = this.seo.origin;
    this.seo.setJsonLd('ld-org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Upsoma Restro',
      url: origin,
      description: 'All-in-one restaurant platform for QR ordering, kitchen display, billing, self-serve receipts, ratings and guest marketing.',
      contactPoint: {
        '@type': 'ContactPoint', contactType: 'sales',
        email: 'upsomaconsultancy@gmail.com', telephone: '+91-91368-18545', areaServed: 'IN',
      },
    });

    this.seo.setJsonLd('ld-software', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Upsoma Restro',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'QR self-ordering, real-time kitchen display, billing, self-serve receipts, ratings, inventory, multi-outlet analytics and guest re-engagement marketing (WhatsApp, RCS, SMS). 10-day free trial, billed per table.',
      offers: {
        '@type': 'AggregateOffer', priceCurrency: 'INR',
        lowPrice: '349', highPrice: '399', offerCount: '2',
        description: 'Per-table monthly pricing after a 10-day free trial. ₹349 per table (up to 4 seats), ₹399 per table (6-seat family tables).',
      },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '126' },
    });

    this.seo.setJsonLd('ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.faqs.map((f) => ({
        '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });

    this.seo.setJsonLd('ld-website', {
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Upsoma Restro', url: origin,
    });
  }
}
