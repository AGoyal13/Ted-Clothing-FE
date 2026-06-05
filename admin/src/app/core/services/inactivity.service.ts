import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { fromEvent, merge, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { AuthService } from './auth.service';

const IDLE_MS  = 30 * 60 * 1000;  // 30 min → auto-logout
const WARN_MS  = 25 * 60 * 1000;  // 25 min → show warning banner

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private readonly authService = inject(AuthService);

  // Emits true when the warning banner should be shown (5 min before logout)
  readonly showWarning = signal(false);

  private eventSub: Subscription | null = null;
  private warnHandle: ReturnType<typeof setTimeout> | null = null;
  private logoutHandle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Start/stop watching automatically as login state changes
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  // Call once from AppComponent to ensure the service is instantiated
  init(): void { /* constructor effect handles everything */ }

  private start(): void {
    this.stop();

    const activity$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll'),
    ).pipe(throttleTime(500)); // collapse rapid events

    this.eventSub = activity$.subscribe(() => this.reset());
    this.scheduleTimers();
  }

  private stop(): void {
    this.eventSub?.unsubscribe();
    this.eventSub = null;
    this.clearTimers();
    this.showWarning.set(false);
  }

  private reset(): void {
    this.clearTimers();
    this.showWarning.set(false);
    this.scheduleTimers();
  }

  private scheduleTimers(): void {
    this.warnHandle   = setTimeout(() => this.showWarning.set(true), WARN_MS);
    this.logoutHandle = setTimeout(() => this.authService.logout(),  IDLE_MS);
  }

  private clearTimers(): void {
    if (this.warnHandle)   { clearTimeout(this.warnHandle);   this.warnHandle   = null; }
    if (this.logoutHandle) { clearTimeout(this.logoutHandle); this.logoutHandle = null; }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
