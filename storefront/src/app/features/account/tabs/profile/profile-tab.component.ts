import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

type FieldState = 'idle' | 'editing' | 'otp-sent' | 'saving';

@Component({
  selector: 'app-profile-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile-tab.component.html',
  styleUrl: './profile-tab.component.scss',
})
export class ProfileTabComponent {
  readonly authService = inject(AuthService);

  readonly profileName = signal(this.authService.currentUser()?.name ?? '');
  readonly nameSaving  = signal(false);
  readonly nameMsg     = signal<string | null>(null);

  readonly emailState = signal<FieldState>('idle');
  readonly newEmail   = signal('');
  readonly emailOtp   = signal('');
  readonly emailMsg   = signal<string | null>(null);

  readonly phoneState = signal<FieldState>('idle');
  readonly newPhone   = signal('');
  readonly phoneOtp   = signal('');
  readonly phoneMsg   = signal<string | null>(null);

  readonly pwCurrent   = signal('');
  readonly pwNew       = signal('');
  readonly pwConfirm   = signal('');
  readonly pwSaving    = signal(false);
  readonly pwMsg       = signal<string | null>(null);
  readonly showPwModal = signal(false);

  saveName(): void {
    if (!this.profileName().trim()) { this.nameMsg.set('Name cannot be empty'); return; }
    this.nameSaving.set(true);
    this.nameMsg.set(null);
    this.authService.updateProfile({ name: this.profileName() }).subscribe({
      next: () => { this.nameSaving.set(false); this.nameMsg.set('✓ Name updated'); },
      error: (e) => { this.nameSaving.set(false); this.nameMsg.set(e?.error?.error?.message ?? 'Failed to save'); },
    });
  }

  sendOtp(purpose: 'EMAIL' | 'PHONE'): void {
    const val = purpose === 'EMAIL' ? this.newEmail() : this.newPhone();
    const setState = purpose === 'EMAIL' ? this.emailState : this.phoneState;
    const setMsg   = purpose === 'EMAIL' ? this.emailMsg   : this.phoneMsg;
    setMsg.set(null);
    this.authService.sendProfileOtp(purpose, val).subscribe({
      next: () => setState.set('otp-sent'),
      error: (e) => setMsg.set(e?.error?.error?.message ?? 'Failed to send OTP'),
    });
  }

  verifyAndSave(purpose: 'EMAIL' | 'PHONE'): void {
    const val      = purpose === 'EMAIL' ? this.newEmail()   : this.newPhone();
    const otp      = purpose === 'EMAIL' ? this.emailOtp()   : this.phoneOtp();
    const setState = purpose === 'EMAIL' ? this.emailState   : this.phoneState;
    const setMsg   = purpose === 'EMAIL' ? this.emailMsg     : this.phoneMsg;
    setState.set('saving');
    this.authService.updateProfile({ purpose, newValue: val, otp }).subscribe({
      next: () => {
        setState.set('idle');
        setMsg.set(`✓ ${purpose === 'EMAIL' ? 'Email' : 'Phone'} updated`);
        if (purpose === 'EMAIL') { this.newEmail.set(''); this.emailOtp.set(''); }
        else { this.newPhone.set(''); this.phoneOtp.set(''); }
      },
      error: (e) => {
        setState.set('otp-sent');
        setMsg.set(e?.error?.error?.message ?? 'Invalid or expired OTP');
      },
    });
  }

  cancelField(field: 'email' | 'phone'): void {
    if (field === 'email') { this.emailState.set('idle'); this.newEmail.set(''); this.emailOtp.set(''); this.emailMsg.set(null); }
    else { this.phoneState.set('idle'); this.newPhone.set(''); this.phoneOtp.set(''); this.phoneMsg.set(null); }
  }

  closePwModal(): void {
    this.showPwModal.set(false);
    this.pwCurrent.set(''); this.pwNew.set(''); this.pwConfirm.set('');
    this.pwMsg.set(null);
  }

  changePassword(): void {
    if (!this.pwCurrent() || !this.pwNew() || !this.pwConfirm()) { this.pwMsg.set('All fields are required'); return; }
    if (this.pwNew().length < 8) { this.pwMsg.set('New password must be at least 8 characters'); return; }
    if (this.pwNew() !== this.pwConfirm()) { this.pwMsg.set('Passwords do not match'); return; }
    this.pwSaving.set(true);
    this.pwMsg.set(null);
    this.authService.changePassword(this.pwCurrent(), this.pwNew()).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.pwMsg.set('✓ Password updated');
        setTimeout(() => this.closePwModal(), 1200);
      },
      error: (e) => { this.pwSaving.set(false); this.pwMsg.set(e?.error?.error?.message ?? 'Failed to update password'); },
    });
  }
}
