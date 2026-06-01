import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'pdp-notify',
  standalone: true,
  imports: [],
  templateUrl: './pdp-notify.component.html',
  styleUrl: './pdp-notify.component.scss',
})
export class PdpNotifyComponent implements OnChanges {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);

  @Input() productId = '';
  @Input() skuId: string | null = null;
  @Input() colorId: string | null = null;

  readonly notifyOpen = signal(false);
  readonly notifyEmail = signal('');
  readonly notifySending = signal(false);
  readonly notifySent = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['colorId'] && !changes['colorId'].firstChange) {
      this.notifyOpen.set(false);
      this.notifySent.set(false);
    }
  }

  openNotify(): void {
    const user = this.authService.currentUser();
    this.notifyEmail.set(user?.email ?? '');
    this.notifyOpen.set(true);
  }

  submitNotify(): void {
    const email = this.notifyEmail().trim();
    if (!this.productId || !email) return;

    this.notifySending.set(true);
    this.apiService.post('/stock-notifications', {
      productId: this.productId,
      skuId: this.skuId ?? null,
      email,
    }).subscribe({
      next: () => {
        this.notifySent.set(true);
        this.notifyOpen.set(false);
        this.notifySending.set(false);
      },
      error: () => {
        this.notifySending.set(false);
      },
    });
  }
}
