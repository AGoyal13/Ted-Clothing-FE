import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.scss',
})
export class NewsletterComponent {
  readonly auth = inject(AuthService);
  readonly email = signal('');
  readonly submitted = signal(false);

  onSubmit(): void {
    if (!this.email()) return;
    // No backend yet — just show success state
    this.submitted.set(true);
  }
}
