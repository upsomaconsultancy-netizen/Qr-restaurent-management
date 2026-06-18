import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { MarketingLegalComponent } from './marketing-legal.component';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [MarketingLegalComponent],
  template: `
    <mkt-legal heading="Privacy Policy" updated="June 2026">
      <p>
        This Privacy Policy explains how <strong>Upsoma Restro</strong> ("we", "us", "our")
        collects, uses, and protects information when you use our restaurant management
        platform and marketing website. By using our services you agree to the practices
        described here.
      </p>

      <h2>1. Information we collect</h2>
      <p>We collect the following categories of information:</p>
      <ul>
        <li><strong>Restaurant account data</strong> — name, contact details, outlet addresses, GST details and login credentials of restaurant owners and staff.</li>
        <li><strong>Customer order data</strong> — when a guest places an order through a table QR code, we collect their name, mobile number, ordered items and bill amount on behalf of the restaurant.</li>
        <li><strong>Demo &amp; sales enquiries</strong> — name, phone, optional email and address submitted through our "Book a Demo" form.</li>
        <li><strong>Technical data</strong> — IP address, browser type and usage analytics to keep the service secure and reliable.</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To operate core features: ordering, kitchen display, billing, inventory and analytics.</li>
        <li>To help restaurants understand their guests and improve their service.</li>
        <li><strong>Marketing on behalf of restaurants</strong> — customer order data (such as name and mobile number) may be used by the restaurant to send promotional and re-engagement messages about local offers via WhatsApp, RCS or SMS. Restaurants are responsible for obtaining the consent required by applicable law before sending such messages.</li>
        <li>To respond to demo requests and provide customer support.</li>
        <li>To detect, prevent and address security or technical issues.</li>
      </ul>

      <h2>3. Marketing communications &amp; opt-out</h2>
      <p>
        Guests can opt out of promotional messages at any time by replying with the opt-out
        keyword provided in the message (for example "STOP") or by contacting the restaurant.
        We provide tools for restaurants to honour these opt-outs.
      </p>

      <h2>4. Data sharing</h2>
      <p>
        We do not sell personal information. We share data only with: (a) the restaurant that
        the data belongs to; (b) trusted service providers (such as cloud hosting, image
        storage and messaging API providers) who process data on our behalf; and (c) authorities
        where required by law.
      </p>

      <h2>5. Data retention &amp; security</h2>
      <p>
        We retain data for as long as needed to provide the service and meet legal obligations.
        Each restaurant's data is logically isolated, access is role-based, and we apply industry
        standard security measures including encryption in transit and validated server-side
        pricing.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access, correct, or delete your
        personal data. To exercise these rights, contact us at
        <a href="mailto:upsomaconsultancy@gmail.com">upsomaconsultancy&#64;gmail.com</a>.
      </p>

      <h2>7. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be reflected by the
        "Last updated" date above.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about this policy? Email
        <a href="mailto:upsomaconsultancy@gmail.com">upsomaconsultancy&#64;gmail.com</a>.
      </p>
    </mkt-legal>
  `
})
export class PrivacyPolicyComponent implements OnInit {
  private seo = inject(SeoService);
  ngOnInit(): void {
    this.seo.apply({
      title: 'Privacy Policy — Upsoma Restro',
      description: 'How Upsoma Restro collects, uses and protects restaurant and customer data, including marketing communications and your privacy rights.',
      path: '/privacy-policy',
    });
  }
}
