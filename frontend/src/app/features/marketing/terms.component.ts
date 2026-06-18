import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { MarketingLegalComponent } from './marketing-legal.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [MarketingLegalComponent],
  template: `
    <mkt-legal heading="Terms & Conditions" updated="June 2026">
      <p>
        These Terms &amp; Conditions ("Terms") govern your access to and use of the
        <strong>Upsoma Restro</strong> platform and website. By creating an account or using
        our services, you agree to these Terms.
      </p>

      <h2>1. The service</h2>
      <p>
        Upsoma Restro provides software for QR-based ordering, kitchen display, billing,
        inventory, analytics and customer re-engagement for restaurants and cloud kitchens.
        Features may evolve over time.
      </p>

      <h2>2. Free trial &amp; subscription</h2>
      <ul>
        <li>New restaurants receive a <strong>10-day free trial</strong> with no upfront charge.</li>
        <li>After the trial, pricing is charged <strong>per table</strong> — there is no separate platform or restaurant fee.</li>
        <li>Current rates: <strong>₹349 per table per month</strong> for tables of up to 4 seats, and <strong>₹399 per table per month</strong> for 6-seat family tables.</li>
        <li>Home delivery is an upcoming add-on; its pricing will be announced separately.</li>
        <li>Fees are billed in advance and are non-refundable except where required by law.</li>
      </ul>

      <h2>3. Accounts &amp; responsibilities</h2>
      <p>
        You are responsible for maintaining the confidentiality of your login credentials and
        for all activity under your account. You must provide accurate information and keep it
        up to date.
      </p>

      <h2>4. Acceptable use</h2>
      <ul>
        <li>Do not use the service for unlawful, harmful or fraudulent purposes.</li>
        <li>Do not attempt to disrupt, reverse-engineer or gain unauthorised access to the platform.</li>
        <li>When sending marketing messages to guests, you must comply with all applicable laws and obtain any required consent.</li>
      </ul>

      <h2>5. Customer data &amp; marketing</h2>
      <p>
        Restaurants own the customer data they collect through the platform and are the data
        controllers for that information. You are solely responsible for how you use customer
        contact details, including WhatsApp, RCS or SMS marketing, and for honouring opt-out
        requests in line with our <a href="/privacy-policy">Privacy Policy</a> and applicable law.
      </p>

      <h2>6. Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service. We may perform
        maintenance and update or discontinue features with reasonable notice where practical.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Upsoma Restro is not liable for indirect,
        incidental or consequential damages, or for loss of profits, data or goodwill arising
        from your use of the service.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may cancel at any time. We may suspend or terminate access for breach of these Terms
        or non-payment. On termination, your right to use the service ends.
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>
        We may revise these Terms from time to time. Continued use after changes take effect
        constitutes acceptance of the updated Terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        For any questions about these Terms, email
        <a href="mailto:upsomaconsultancy@gmail.com">upsomaconsultancy&#64;gmail.com</a>.
      </p>
    </mkt-legal>
  `
})
export class TermsComponent implements OnInit {
  private seo = inject(SeoService);
  ngOnInit(): void {
    this.seo.apply({
      title: 'Terms & Conditions — Upsoma Restro',
      description: 'The terms governing use of the Upsoma Restro restaurant platform, including the 10-day free trial and per-table pricing.',
      path: '/terms',
    });
  }
}
