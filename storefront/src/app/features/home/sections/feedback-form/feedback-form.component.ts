import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { AddressService } from '../../../../core/services/address.service';

interface FeedbackPayload {
  name: string;
  location: string;
  quote: string;
  rating: number;
}

@Component({
  selector: 'app-feedback-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './feedback-form.component.html',
  styleUrl: './feedback-form.component.scss',
})
export class FeedbackFormComponent {
  private auth           = inject(AuthService);
  private api            = inject(ApiService);
  private addressService = inject(AddressService);

  readonly stars = [1, 2, 3, 4, 5];

  readonly selectedRating = signal(5);
  readonly hoverRating    = signal(0);
  readonly loading        = signal(false);
  readonly submitted      = signal(false);
  readonly submittedName  = signal('');
  readonly errorMsg       = signal('');
  readonly toast          = signal('');

  name     = '';
  location = '';
  quote    = '';

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.name) this.name = user.name;
      if (user) this.addressService.load();
    });

    effect(() => {
      const addrs = this.addressService.addresses();
      if (addrs.length > 0 && !this.location) {
        const def = addrs.find(a => a.isDefault) ?? addrs[0];
        this.location = def.city;
      }
    });
  }

  submit(): void {
    this.errorMsg.set('');

    if (!this.quote.trim() || this.quote.trim().length < 10) {
      this.errorMsg.set('Please write at least 10 characters for your review.');
      return;
    }
    if (!this.name.trim()) {
      this.errorMsg.set('Please enter your name.');
      return;
    }
    if (!this.location.trim()) {
      this.errorMsg.set('Please enter your city.');
      return;
    }

    this.loading.set(true);

    const payload: FeedbackPayload = {
      name:     this.name.trim(),
      location: this.location.trim(),
      quote:    this.quote.trim(),
      rating:   this.selectedRating(),
    };

    this.api.post<unknown>('/feedback', payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.submittedName.set(payload.name.split(' ')[0]);
        this.submitted.set(true);
        this.showToast('Review submitted! It will appear once approved.');
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Failed to submit. Please try again.');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
