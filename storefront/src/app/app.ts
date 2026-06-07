import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { NavbarComponent } from './shared/navbar/navbar.component'; // v1 — kept for rollback
import { NavbarV2Component } from './shared/navbar-v2/navbar-v2.component';
import { FooterComponent } from './shared/footer/footer.component';
import { CursorComponent } from './shared/cursor/cursor.component';
import { AuthModalComponent } from './shared/auth-modal/auth-modal.component';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarV2Component, FooterComponent, CursorComponent, AuthModalComponent],
  template: `
    <app-cursor />
    <app-navbar-v2 />
    <!-- <app-navbar /> -->
    <router-outlet />
    <app-footer />
    @if (authService.modalOpen()) {
      <app-auth-modal />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
  `],
})
export class App {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
}
