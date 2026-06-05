import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactivityService } from './core/services/inactivity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />

    @if (inactivity.showWarning()) {
      <div class="inactivity-warning">
        <span>Session expiring in 5 minutes due to inactivity.</span>
        <button (click)="keepAlive()">Stay logged in</button>
      </div>
    }
  `,
  styles: [`
    .inactivity-warning {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      background: #b45309;
      color: #fff;
      padding: 0.75rem 1.25rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 9999;
      font-size: 0.875rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .inactivity-warning button {
      background: #fff;
      color: #b45309;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8rem;
    }
  `],
})
export class App implements OnInit {
  readonly inactivity = inject(InactivityService);

  ngOnInit(): void {
    // Ensures the service is instantiated and its effect() starts running
    this.inactivity.init();
  }

  keepAlive(): void {
    // Any interaction resets the timer via the event listeners in InactivityService.
    // Clicking this button counts as interaction — the warning will hide automatically.
  }
}
