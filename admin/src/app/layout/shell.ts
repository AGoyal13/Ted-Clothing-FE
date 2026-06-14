import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
    MatIconModule, MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="sidenavOpen()"
        (openedChange)="sidenavOpen.set($event)"
        class="sidenav">
        <div class="sidenav-header">
          <span class="brand">Ted Clothing</span>
          <span class="role">Admin</span>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/categories" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>category</mat-icon>
            <span matListItemTitle>Categories</span>
          </a>
          <a mat-list-item routerLink="/products" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>inventory_2</mat-icon>
            <span matListItemTitle>Products</span>
          </a>
          <a mat-list-item routerLink="/skus" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>inventory</mat-icon>
            <span matListItemTitle>Inventory</span>
          </a>
          <!-- Inventory Upload commented out — superseded by Inventory dashboard + Product Import
          <a mat-list-item routerLink="/inventory" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>upload_file</mat-icon>
            <span matListItemTitle>Inventory Upload</span>
          </a>
          -->
          <a mat-list-item routerLink="/product-import" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>cloud_upload</mat-icon>
            <span matListItemTitle>Product Import</span>
          </a>
          <a mat-list-item routerLink="/orders" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span matListItemTitle>Orders</span>
          </a>
          <a mat-list-item routerLink="/ndr" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>report_problem</mat-icon>
            <span matListItemTitle>NDR Queue</span>
          </a>
          <a mat-list-item routerLink="/returns" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>assignment_return</mat-icon>
            <span matListItemTitle>Returns</span>
          </a>
          <a mat-list-item routerLink="/warehouses" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>warehouse</mat-icon>
            <span matListItemTitle>Warehouses</span>
          </a>
          <a mat-list-item routerLink="/shipping-cache" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>cached</mat-icon>
            <span matListItemTitle>ETD Cache</span>
          </a>
          <a mat-list-item routerLink="/feedback" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>rate_review</mat-icon>
            <span matListItemTitle>Feedback</span>
          </a>
          <a mat-list-item routerLink="/reviews" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>star_rate</mat-icon>
            <span matListItemTitle>Reviews</span>
          </a>
          <a mat-list-item routerLink="/coupons" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
            <mat-icon matListItemIcon>confirmation_number</mat-icon>
            <span matListItemTitle>Coupons</span>
          </a>
          <a mat-list-item routerLink="/settings" routerLinkActive="active" (click)="isMobile() && sidenavOpen.set(false)">
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
            <button mat-icon-button (click)="sidenavOpen.set(!sidenavOpen())" aria-label="Open menu">
              <mat-icon>menu</mat-icon>
            </button>
            <span class="toolbar-brand">Ted Clothing</span>
          }
          <span class="spacer"></span>
          <span class="user-label">{{ auth.user$()?.email ?? auth.user$()?.phone }}</span>
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

  // Owned signal — avoids one-way [opened] fighting Angular Material's internal state
  sidenavOpen = signal(!this.bp.isMatched('(max-width: 768px)'));

  constructor() {
    // When viewport crosses the mobile breakpoint, snap the drawer open/closed
    effect(() => this.sidenavOpen.set(!this.isMobile()));
  }
}
