import { Component, computed, inject, signal } from '@angular/core';
import { SiteConfigService } from '../../../core/services/site-config.service';

interface Faq {
  q: string;
  a: string;
}

@Component({
  selector: 'app-faqs',
  standalone: true,
  templateUrl: './faqs.component.html',
  styleUrl: './faqs.component.scss',
})
export class FaqsComponent {
  private readonly siteConfig = inject(SiteConfigService);
  readonly openIndex = signal<number | null>(null);

  // Return/exchange-dependent entries follow the configured mode so the FAQ never
  // promises a flow that's disabled.
  readonly faqs = computed<Faq[]>(() => {
    const mode = this.siteConfig.returnMode();

    const list: Faq[] = [
      {
        q: 'What sizes does Ted Clothing offer?',
        a: 'We offer sizes XS through XXL across most styles. Refer to our Size Guide for detailed measurements. If you\'re between sizes, we recommend sizing up for a relaxed fit or sizing down for a closer cut.',
      },
      {
        q: 'How long does standard delivery take?',
        a: 'Standard delivery within India takes 4–7 business days from the date of dispatch. Express delivery (2–3 business days) is available at checkout for select pin codes.',
      },
    ];

    // Exchange Q&A only when exchanges are actually offered.
    if (mode === 'exchange' || mode === 'both') {
      list.push({
        q: 'Can I exchange an item for a different size or colour?',
        a: 'Yes. Exchanges are accepted within the return window (see our Returns & Exchanges policy). Request an exchange through My Account → Orders. Exchanges are subject to stock availability.',
      });
    }

    list.push(
      {
        q: 'How do I track my order?',
        a: 'Once your order is dispatched you\'ll receive a tracking link by email and SMS. You can also track live under My Account → Orders. Orders placed as guests can be tracked using the order ID shared in your confirmation email.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, RuPay), UPI (GPay, PhonePe, Paytm), net banking, and Cash on Delivery (COD) for eligible pin codes.',
      },
      {
        q: 'Is Cash on Delivery (COD) available?',
        a: 'COD is available for orders up to ₹5,000 at select pin codes across India. The availability is shown at checkout once you enter your delivery address.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Currently Ted Clothing ships only within India. International shipping is on our roadmap — sign up for our newsletter to be the first to know when it launches.',
      },
      {
        q: 'How should I care for my Ted Clothing pieces?',
        a: 'Each garment includes a care label with specific instructions. As a general rule: machine wash cold on a gentle cycle, avoid tumble drying, and iron on low heat inside out. Delicate fabrics such as linen and silk blends should be dry-cleaned.',
      },
      {
        q: 'I received a wrong or damaged item — what do I do?',
        a: 'We\'re sorry about that. Email us at hello@tedclothing.in within 48 hours of delivery with your order number and clear photos of the item and packaging. Verified cases are resolved with a free replacement or full refund.',
      },
    );

    // Cancel answer — trailing clause depends on whether post-delivery returns/exchanges exist.
    const cancelTail =
      mode === 'none'
        ? 'Once an order is packed or dispatched it cannot be cancelled.'
        : mode === 'exchange'
          ? 'Once an order is packed or dispatched it cannot be cancelled — you may request an exchange after delivery.'
          : 'Once an order is packed or dispatched it cannot be cancelled — you may initiate a return after delivery.';
    list.push({
      q: 'Can I cancel my order after placing it?',
      a: `Orders can be cancelled within 1 hour of placement by contacting us at hello@tedclothing.in. ${cancelTail}`,
    });

    return list;
  });

  toggle(index: number): void {
    this.openIndex.update(current => current === index ? null : index);
  }
}
