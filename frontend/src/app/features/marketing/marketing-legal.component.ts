import { Component, Input } from '@angular/core';
import { MarketingNavComponent } from './marketing-nav.component';
import { MarketingFooterComponent } from './marketing-footer.component';

/**
 * Shared layout for legal/long-form marketing pages (Privacy, Terms).
 * Provides nav, a titled header and the footer; page supplies body via <ng-content>.
 */
@Component({
  selector: 'mkt-legal',
  standalone: true,
  imports: [MarketingNavComponent, MarketingFooterComponent],
  template: `
    <mkt-nav></mkt-nav>
    <main class="lg">
      <header class="lg-hero">
        <div class="lg-hero-inner">
          <h1>{{ heading }}</h1>
          @if (updated) { <p class="lg-updated">Last updated: {{ updated }}</p> }
        </div>
      </header>
      <article class="lg-body">
        <ng-content></ng-content>
      </article>
    </main>
    <mkt-footer></mkt-footer>
  `,
  styles: [`
    :host { display: block; background: #fbf9f6; color: #16181d; }
    .lg-hero { background: #f3efe9; border-bottom: 1px solid #efe9e3; }
    .lg-hero-inner { max-width: 820px; margin: 0 auto; padding: 3.25rem 1.25rem 2.5rem; }
    .lg-hero h1 { font-family: 'Sora', sans-serif; font-size: clamp(1.8rem, 4vw, 2.6rem); margin: 0; letter-spacing: -.02em; }
    .lg-updated { color: #6a6d74; margin: .6rem 0 0; font-size: .92rem; }
    .lg-body { max-width: 820px; margin: 0 auto; padding: 2.75rem 1.25rem 4rem; }
    .lg-body ::ng-deep h2 {
      font-family: 'Sora', sans-serif; font-size: 1.3rem; margin: 2rem 0 .75rem; color: #16181d;
    }
    .lg-body ::ng-deep h2:first-child { margin-top: 0; }
    .lg-body ::ng-deep p { color: #45474d; line-height: 1.75; margin: 0 0 1rem; }
    .lg-body ::ng-deep ul { color: #45474d; line-height: 1.75; padding-left: 1.25rem; margin: 0 0 1rem; }
    .lg-body ::ng-deep li { margin-bottom: .4rem; }
    .lg-body ::ng-deep a { color: #e8542f; text-decoration: none; }
    .lg-body ::ng-deep a:hover { text-decoration: underline; }
    .lg-body ::ng-deep strong { color: #16181d; }
  `]
})
export class MarketingLegalComponent {
  @Input() heading = '';
  @Input() updated = '';
}
