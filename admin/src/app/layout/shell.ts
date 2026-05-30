import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, AsyncPipe,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav #drawer
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="sidenav">
        <div class="sidenav-header">
          <span class="brand">Ted Clothing</span>
          <span class="role">Admin</span>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/categories" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>category</mat-icon>
            <span matListItemTitle>Categories</span>
          </a>
          <a mat-list-item routerLink="/products" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>inventory_2</mat-icon>
            <span matListItemTitle>Products</span>
          </a>
          <a mat-list-item routerLink="/skus" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>qr_code</mat-icon>
            <span matListItemTitle>SKUs</span>
          </a>
          <a mat-list-item routerLink="/inventory" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>upload_file</mat-icon>
            <span matListItemTitle>Inventory Upload</span>
          </a>
          <a mat-list-item routerLink="/product-import" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>cloud_upload</mat-icon>
            <span matListItemTitle>Product Import</span>
          </a>
          <a mat-list-item routerLink="/feedback" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>rate_review</mat-icon>
            <span matListItemTitle>Feedback</span>
          </a>
          <a mat-list-item routerLink="/settings" routerLinkActive="active" (click)="isMobile() && drawer.close()">
            <mat-icon matListItemIcon>tune</mat-icon>
            <span matListItemTitle>Settings</span>
          </a>
        </mat-nav-list>
        <div class="sidenav-footer">
          <button mat-button (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <mat-toolbar color="primary" class="toolbar">
          @if (isMobile()) {
            <button mat-icon-button (click)="drawer.toggle()" aria-label="Open menu">
              <mat-icon>menu</mat-icon>
            </button>
            <span class="toolbar-brand">Ted Clothing</span>
          }
          <span class="spacer"></span>
          <span class="user-label">{{ (auth.user$ | async)?.email ?? (auth.user$ | async)?.phone }}</span>
        </mat-toolbar>
        <div class="page">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell { height: 100vh; }
    .sidenav { width: 220px; display: flex; flex-direction: column; }
    .sidenav-header { padding: 16px; background: #1a237e; color: white; }
    .brand { display: block; font-size: 18px; font-weight: 700; }
    .role { font-size: 12px; opacity: 0.7; }
    mat-nav-list { flex: 1; }
    .active { background: rgba(0,0,0,.08); }
    .sidenav-footer { padding: 8px; }
    .toolbar { position: sticky; top: 0; z-index: 10; gap: 4px; }
    .toolbar-brand { font-size: 16px; font-weight: 600; margin-left: 4px; }
    .spacer { flex: 1; }
    .user-label { font-size: 13px; opacity: 0.9; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .page { padding: 24px; }

    @media (max-width: 768px) {
      .page { padding: 12px; }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  private bp = inject(BreakpointObserver);

  isMobile = toSignal(
    this.bp.observe('(max-width: 768px)').pipe(map(r => r.matches)),
    { initialValue: this.bp.isMatched('(max-width: 768px)') },
  );
}
