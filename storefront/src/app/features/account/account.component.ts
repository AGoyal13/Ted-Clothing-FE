import { Component, computed, effect, HostListener, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AddressService } from '../../core/services/address.service';
import { ThemeSwitcherComponent } from '../../shared/theme-switcher/theme-switcher.component';
import { Address, AddressFormData } from '../../core/models/address.model';

type Tab = 'profile' | 'wishlist' | 'addresses' | 'preferences';
type FieldState = 'idle' | 'editing' | 'otp-sent' | 'saving';

function emptyForm(): AddressFormData {
  return { name: '', phone: '', line1: '', city: '', state: '', pincode: '', isDefault: false };
}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, ThemeSwitcherComponent],
  template: `
    <main class="acct">
      @if (authService.currentUser(); as user) {
        <div class="acct__layout">

          <!-- Sidebar -->
          <aside class="acct__sidebar">
            <div class="acct__profile">
              <span class="acct__profile-label">{{ user.name || 'MY ACCOUNT' }}</span>
              <span class="acct__profile-email">{{ user.email }}</span>
            </div>
            <!-- Desktop nav (hidden on mobile) -->
            <nav class="acct__nav">
              <a class="acct__nav-item" [routerLink]="['/account', 'profile']" [class.acct__nav-item--active]="tab() === 'profile'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
              </a>
              <a class="acct__nav-item" [routerLink]="['/account', 'wishlist']" [class.acct__nav-item--active]="tab() === 'wishlist'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Wishlist
                @if (wishlistService.count() > 0) {
                  <span class="acct__nav-badge">{{ wishlistService.count() }}</span>
                }
              </a>
              <a class="acct__nav-item" [routerLink]="['/account', 'addresses']" [class.acct__nav-item--active]="tab() === 'addresses'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Addresses
                @if (addressService.addresses().length > 0) {
                  <span class="acct__nav-badge">{{ addressService.addresses().length }}</span>
                }
              </a>
              <a class="acct__nav-item" [routerLink]="['/account', 'preferences']" [class.acct__nav-item--active]="tab() === 'preferences'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Preferences
              </a>
            </nav>

            <!-- Mobile nav dropdown (hidden on desktop) -->
            <div class="acct__nav-mob" (click)="$event.stopPropagation()">
              <button class="acct__nav-mob-trigger" (click)="navOpen.update(v => !v)"
                      [attr.aria-expanded]="navOpen()">
                <span class="acct__nav-mob-trigger-label">
                  @switch (tab()) {
                    @case ('profile') {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    }
                    @case ('wishlist') {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    }
                    @case ('addresses') {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    }
                    @case ('preferences') {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    }
                  }
                  {{ tabLabel() }}
                </span>
                <svg class="acct__nav-mob-chevron" [class.acct__nav-mob-chevron--open]="navOpen()"
                     width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              @if (navOpen()) {
                <div class="acct__nav-mob-options">
                  <a class="acct__nav-mob-opt" [routerLink]="['/account', 'profile']" [class.acct__nav-mob-opt--active]="tab() === 'profile'" (click)="navOpen.set(false)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile
                  </a>
                  <a class="acct__nav-mob-opt" [routerLink]="['/account', 'wishlist']" [class.acct__nav-mob-opt--active]="tab() === 'wishlist'" (click)="navOpen.set(false)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Wishlist
                    @if (wishlistService.count() > 0) {
                      <span class="acct__nav-badge">{{ wishlistService.count() }}</span>
                    }
                  </a>
                  <a class="acct__nav-mob-opt" [routerLink]="['/account', 'addresses']" [class.acct__nav-mob-opt--active]="tab() === 'addresses'" (click)="navOpen.set(false)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Addresses
                    @if (addressService.addresses().length > 0) {
                      <span class="acct__nav-badge">{{ addressService.addresses().length }}</span>
                    }
                  </a>
                  <a class="acct__nav-mob-opt" [routerLink]="['/account', 'preferences']" [class.acct__nav-mob-opt--active]="tab() === 'preferences'" (click)="navOpen.set(false)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Preferences
                  </a>
                </div>
              }
            </div>

            <button class="acct__signout" (click)="logout()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </aside>

          <!-- Content -->
          <div class="acct__content">

            <!-- ── Profile ─────────────────────────────────────── -->
            @if (tab() === 'profile') {
              <div class="acct__panel">
                <h2 class="acct__panel-title">PROFILE</h2>

                <!-- Name -->
                <div class="prof-section">
                  <label class="prof-label">Name</label>
                  <div class="prof-row">
                    <input class="prof-input" [ngModel]="profileName()"
                           (ngModelChange)="profileName.set($event)"
                           placeholder="Your name" maxlength="80" />
                    <button class="prof-save-btn" (click)="saveName()" [disabled]="nameSaving() || !profileName().trim()">
                      {{ nameSaving() ? 'Saving…' : 'Save' }}
                    </button>
                  </div>
                  @if (nameMsg()) {
                    <p class="prof-msg" [class.prof-msg--ok]="nameMsg()!.startsWith('✓')">{{ nameMsg() }}</p>
                  }
                </div>

                <!-- Email -->
                <div class="prof-section">
                  <label class="prof-label">Email</label>
                  @if (emailState() === 'idle') {
                    <div class="prof-row">
                      <span class="prof-value">{{ user.email || '—' }}</span>
                      <button class="prof-change-btn" (click)="emailState.set('editing')">Change</button>
                    </div>
                  } @else {
                    <div class="prof-otp-block">
                      <div class="prof-row">
                        <input class="prof-input" [ngModel]="newEmail()" (ngModelChange)="newEmail.set($event)"
                               type="email" placeholder="New email address"
                               [disabled]="emailState() === 'otp-sent' || emailState() === 'saving'" />
                        @if (emailState() === 'editing') {
                          <button class="prof-save-btn" (click)="sendOtp('EMAIL')" [disabled]="!newEmail()">Send OTP</button>
                        }
                        @if (emailState() === 'otp-sent' || emailState() === 'saving') {
                          <span class="prof-otp-sent">OTP sent to current email</span>
                        }
                      </div>
                      @if (emailState() === 'otp-sent' || emailState() === 'saving') {
                        <div class="prof-row prof-row--mt">
                          <input class="prof-input prof-input--otp" [ngModel]="emailOtp()"
                                 (ngModelChange)="emailOtp.set($event)"
                                 placeholder="6-digit OTP" maxlength="6" />
                          <button class="prof-save-btn" (click)="verifyAndSave('EMAIL')"
                                  [disabled]="!emailOtp() || emailState() === 'saving'">
                            {{ emailState() === 'saving' ? 'Saving…' : 'Verify & Save' }}
                          </button>
                        </div>
                      }
                      <button class="prof-cancel" (click)="cancelField('email')">Cancel</button>
                    </div>
                  }
                  @if (emailMsg()) {
                    <p class="prof-msg" [class.prof-msg--ok]="emailMsg()!.startsWith('✓')">{{ emailMsg() }}</p>
                  }
                </div>

                <!-- Phone -->
                <div class="prof-section">
                  <label class="prof-label">Mobile Number</label>
                  @if (phoneState() === 'idle') {
                    <div class="prof-row">
                      <span class="prof-value">{{ user.phone || '—' }}</span>
                      <button class="prof-change-btn" (click)="phoneState.set('editing')">{{ user.phone ? 'Change' : 'Add' }}</button>
                    </div>
                  } @else {
                    <div class="prof-otp-block">
                      <div class="prof-row">
                        <input class="prof-input" [ngModel]="newPhone()" (ngModelChange)="newPhone.set($event)"
                               type="tel" placeholder="10-digit number" maxlength="10"
                               [disabled]="phoneState() === 'otp-sent' || phoneState() === 'saving'" />
                        @if (phoneState() === 'editing') {
                          <button class="prof-save-btn" (click)="sendOtp('PHONE')" [disabled]="newPhone().length !== 10">Send OTP</button>
                        }
                        @if (phoneState() === 'otp-sent' || phoneState() === 'saving') {
                          <span class="prof-otp-sent">OTP sent to your email</span>
                        }
                      </div>
                      @if (phoneState() === 'otp-sent' || phoneState() === 'saving') {
                        <div class="prof-row prof-row--mt">
                          <input class="prof-input prof-input--otp" [ngModel]="phoneOtp()"
                                 (ngModelChange)="phoneOtp.set($event)"
                                 placeholder="6-digit OTP" maxlength="6" />
                          <button class="prof-save-btn" (click)="verifyAndSave('PHONE')"
                                  [disabled]="!phoneOtp() || phoneState() === 'saving'">
                            {{ phoneState() === 'saving' ? 'Saving…' : 'Verify & Save' }}
                          </button>
                        </div>
                      }
                      <button class="prof-cancel" (click)="cancelField('phone')">Cancel</button>
                    </div>
                  }
                  @if (phoneMsg()) {
                    <p class="prof-msg" [class.prof-msg--ok]="phoneMsg()!.startsWith('✓')">{{ phoneMsg() }}</p>
                  }
                </div>

                <!-- Change Password -->
                <div class="prof-section">
                  <label class="prof-label">Password</label>
                  <div class="prof-row">
                    <span class="prof-value">••••••••</span>
                    <button class="prof-change-btn" (click)="showPwModal.set(true)">Change</button>
                  </div>
                </div>

              </div>
            }

            <!-- ── Wishlist ─────────────────────────────────────── -->
            @if (tab() === 'wishlist') {
              <div class="acct__panel">
                <h2 class="acct__panel-title">WISHLIST</h2>
                @if (wishlistService.count() === 0) {
                  <p class="acct__empty">Your wishlist is empty. <a routerLink="/" class="acct__empty-link">Start browsing →</a></p>
                } @else {
                  <div class="wl-list">
                    @for (item of wishlistService.items(); track item.skuId) {
                      <div class="wl-item">
                        <a [routerLink]="['/product', item.productSlug]" class="wl-item__img-wrap">
                          @if (item.image) {
                            <img class="wl-item__img" [src]="item.image" [alt]="item.productTitle" loading="lazy" />
                          } @else {
                            <div class="wl-item__img-placeholder"></div>
                          }
                        </a>
                        <button class="wl-item__remove" (click)="removeWishlist(item.productId, item.skuId)" aria-label="Remove from wishlist">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                        <div class="wl-item__info">
                          <a [routerLink]="['/product', item.productSlug]" class="wl-item__title">{{ item.productTitle }}</a>
                          <span class="wl-item__meta">{{ item.colorName }} &middot; {{ item.sizeLabel }}</span>
                          <span class="wl-item__price">
                            ₹{{ wishlistService.effectivePrice(item) | number:'1.0-0' }}
                            @if (item.discountPercent > 0) {
                              <span class="wl-item__original">₹{{ item.basePrice | number:'1.0-0' }}</span>
                            }
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- ── Addresses ───────────────────────────────────── -->
            @if (tab() === 'addresses') {
              <div class="acct__panel">
                <div class="acct__panel-head">
                  <h2 class="acct__panel-title">ADDRESSES</h2>
                  @if (!showForm()) {
                    <button class="acct__add-btn" (click)="openAddForm()">+ Add New</button>
                  }
                </div>

                <!-- Address form -->
                @if (showForm()) {
                  <form class="addr-form" (ngSubmit)="submitAddress()" #addrForm="ngForm" novalidate>
                    <h3 class="addr-form__title">{{ editingId() ? 'Edit Address' : 'New Address' }}</h3>
                    <div class="addr-form__row">
                      <div class="addr-form__field">
                        <label>Full Name *</label>
                        <input [(ngModel)]="form().name" name="name" required placeholder="Recipient name" />
                      </div>
                      <div class="addr-form__field">
                        <label>Phone *</label>
                        <input [(ngModel)]="form().phone" name="phone" required placeholder="10-digit number" maxlength="10" />
                      </div>
                    </div>
                    <div class="addr-form__field">
                      <label>Address Line 1 *</label>
                      <input [(ngModel)]="form().line1" name="line1" required placeholder="House / flat / block no., street name" />
                    </div>
                    <div class="addr-form__field">
                      <label>Address Line 2</label>
                      <input [(ngModel)]="form().line2" name="line2" placeholder="Building, colony, area (optional)" />
                    </div>
                    <div class="addr-form__field">
                      <label>Landmark</label>
                      <input [(ngModel)]="form().landmark" name="landmark" placeholder="Near school, next to temple… (optional)" />
                    </div>
                    <div class="addr-form__field addr-form__field--sm">
                      <label class="addr-form__label-row">
                        Pincode *
                        @if (pincodeStatus() === 'loading') {
                          <span class="addr-form__pin-spinner"></span>
                        } @else if (pincodeStatus() === 'resolved') {
                          <span class="addr-form__pin-status addr-form__pin-status--ok">✓ Location found</span>
                        } @else if (pincodeStatus() === 'error') {
                          <span class="addr-form__pin-status addr-form__pin-status--err">Not found</span>
                        }
                      </label>
                      <input [ngModel]="form().pincode" name="pincode" required
                             placeholder="6 digits" maxlength="6"
                             (ngModelChange)="onPincodeInput($event)" />
                    </div>
                    <div class="addr-form__row">
                      <div class="addr-form__field">
                        <label>City *</label>
                        <input [(ngModel)]="form().city" name="city" required placeholder="Auto-filled from pincode"
                               [disabled]="pincodeStatus() !== 'resolved'" />
                      </div>
                      <div class="addr-form__field">
                        <label>State *</label>
                        <input [(ngModel)]="form().state" name="state" required placeholder="Auto-filled from pincode"
                               [disabled]="pincodeStatus() !== 'resolved'" />
                      </div>
                    </div>
                    <label class="addr-form__default">
                      <input type="checkbox" [(ngModel)]="form().isDefault" name="isDefault" />
                      <span>Set as default address</span>
                    </label>
                    @if (formError()) {
                      <p class="addr-form__error">{{ formError() }}</p>
                    }
                    <div class="addr-form__actions">
                      <button type="submit" class="addr-form__save" [disabled]="saving()">
                        {{ saving() ? 'Saving…' : (editingId() ? 'Save Changes' : 'Save Address') }}
                      </button>
                      <button type="button" class="addr-form__cancel" (click)="closeForm()">Cancel</button>
                    </div>
                  </form>
                }

                <!-- Address list -->
                @if (addressService.loading()) {
                  <p class="acct__empty">Loading…</p>
                } @else if (addressService.addresses().length === 0 && !showForm()) {
                  <p class="acct__empty">No saved addresses yet.</p>
                } @else {
                  <div class="addr-list">
                    @for (addr of addressService.addresses(); track addr.id) {
                      <div class="addr-card" [class.addr-card--default]="addr.isDefault">
                        @if (addr.isDefault) {
                          <span class="addr-card__badge">DEFAULT</span>
                        }
                        <p class="addr-card__name">{{ addr.name }}</p>
                        <p class="addr-card__lines">
                          {{ addr.line1 }}@if (addr.line2) {, {{ addr.line2 }}}@if (addr.landmark) {<br/>Near {{ addr.landmark }}}
                        </p>
                        <p class="addr-card__lines">{{ addr.city }}, {{ addr.state }} – {{ addr.pincode }}</p>
                        <p class="addr-card__phone">{{ addr.phone }}</p>
                        <div class="addr-card__actions">
                          <button class="addr-card__act" (click)="openEditForm(addr)">Edit</button>
                          @if (!addr.isDefault) {
                            <button class="addr-card__act" (click)="setDefault(addr.id)">Set Default</button>
                          }
                          <button class="addr-card__act addr-card__act--danger" (click)="removeAddress(addr.id)">Remove</button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- ── Preferences ─────────────────────────────────── -->
            @if (tab() === 'preferences') {
              <div class="acct__panel">
                <h2 class="acct__panel-title">PREFERENCES</h2>
                <div class="pref-section">
                  <h3 class="pref-section__label">THEME</h3>
                  <app-theme-switcher [inline]="true" />
                </div>
              </div>
            }

          </div><!-- /acct__content -->
        </div><!-- /acct__layout -->

        <!-- ── Change Password Modal ─────────────────────────── -->
        @if (showPwModal()) {
          <div class="pw-modal-overlay" (click)="closePwModal()">
            <div class="pw-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
              <div class="pw-modal__head">
                <span class="pw-modal__title">CHANGE PASSWORD</span>
                <button class="pw-modal__close" (click)="closePwModal()" aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div class="pw-modal__body">
                <div class="pw-modal__field">
                  <label>Current Password</label>
                  <input type="password" [ngModel]="pwCurrent()" (ngModelChange)="pwCurrent.set($event)" placeholder="••••••••" />
                </div>
                <div class="pw-modal__field">
                  <label>New Password</label>
                  <input type="password" [ngModel]="pwNew()" (ngModelChange)="pwNew.set($event)" placeholder="Min 8 characters" />
                </div>
                <div class="pw-modal__field">
                  <label>Confirm New Password</label>
                  <input type="password" [ngModel]="pwConfirm()" (ngModelChange)="pwConfirm.set($event)" placeholder="••••••••" />
                </div>
                @if (pwMsg()) {
                  <p class="pw-modal__msg" [class.pw-modal__msg--ok]="pwMsg()!.startsWith('✓')">{{ pwMsg() }}</p>
                }
                <button class="pw-modal__submit" (click)="changePassword()" [disabled]="pwSaving()">
                  {{ pwSaving() ? 'Updating…' : 'Update Password' }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    </main>
  `,
  styles: [`
    .acct {
      min-height: 100vh;
      padding: 6rem 5% 4rem;
    }

    .acct__layout {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 3rem;
      align-items: start;
    }

    /* ── Sidebar ─────────────────────────────────────────────── */
    .acct__sidebar {
      position: sticky;
      top: 100px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .acct__profile {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(245, 240, 232, 0.08);
      margin-bottom: 1rem;
    }

    .acct__profile-label {
      font-family: var(--font-display);
      font-size: 1.4rem;
      letter-spacing: 0.12em;
      color: var(--gold);
    }

    .acct__profile-email {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
    }

    .acct__nav {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .acct__nav-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.6rem;
      width: 100%;
      text-align: left;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);
      background: none;
      border: none;
      padding: 0.6rem 0.75rem;
      cursor: pointer;
      text-decoration: none;
      transition: color 0.2s, background 0.2s;
      border-radius: 2px;

      &:hover { color: var(--cream); background: rgba(245, 240, 232, 0.04); }
    }

    .acct__nav-item svg {
      flex-shrink: 0;
      stroke: currentColor;
    }

    .acct__nav-item--active {
      color: var(--cream);
      background: rgba(201, 168, 76, 0.08);
      border-left: 2px solid var(--gold);
      padding-left: calc(0.75rem - 2px);
    }

    .acct__nav-item--active svg {
      stroke: var(--gold);
    }

    .acct__nav-badge {
      background: var(--gold);
      color: var(--bg);
      font-size: 0.65rem;
      font-weight: 600;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
      margin-left: auto;
    }

    .acct__signout {
      margin-top: 2rem;
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
      background: none;
      border: none;
      padding: 0.6rem 0.75rem;
      cursor: pointer;
      text-align: left;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      svg { flex-shrink: 0; stroke: currentColor; }
      &:hover { color: var(--cream); }
    }

    /* ── Content panel ───────────────────────────────────────── */
    .acct__content {
      min-height: 400px;
    }

    .acct__panel {
      animation: fadeUp 0.2s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .acct__panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .acct__panel-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      letter-spacing: 0.18em;
      color: var(--cream);
      margin-bottom: 1.5rem;
    }

    .acct__panel-head .acct__panel-title { margin-bottom: 0; }

    .acct__empty {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);
    }

    .acct__empty-link {
      color: var(--gold);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .acct__add-btn {
      font-family: var(--font-display);
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      color: var(--gold);
      background: none;
      border: 1px solid rgba(201, 168, 76, 0.35);
      padding: 0.4rem 0.9rem;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      &:hover { background: rgba(201, 168, 76, 0.08); border-color: var(--gold); }
    }

    /* ── Wishlist 2-col card grid ────────────────────────────── */
    .wl-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem 1rem;
    }

    .wl-item {
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .wl-item__img-wrap {
      display: block;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      background: rgba(245, 240, 232, 0.04);
      margin-bottom: 0.75rem;
    }

    .wl-item__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .wl-item__img-wrap:hover .wl-item__img { transform: scale(1.04); }

    .wl-item__img-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(245, 240, 232, 0.06);
    }

    .wl-item__remove {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(13, 13, 13, 0.6);
      backdrop-filter: blur(4px);
      border: none;
      border-radius: 50%;
      color: var(--muted);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      &:hover { background: rgba(13, 13, 13, 0.9); color: var(--cream); }
    }

    .wl-item__info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .wl-item__title {
      font-family: var(--font-sans);
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--cream);
      text-decoration: none;
      line-height: 1.35;
      transition: color 0.2s;
      &:hover { color: var(--gold); }
    }

    .wl-item__meta {
      font-family: var(--font-sans);
      font-size: 0.74rem;
      color: var(--muted);
    }

    .wl-item__price {
      font-family: var(--font-sans);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--cream);
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-top: 0.15rem;
    }

    .wl-item__original {
      font-size: 0.72rem;
      font-weight: 400;
      color: var(--muted);
      text-decoration: line-through;
    }

    /* ── Address form ────────────────────────────────────────── */
    .addr-form {
      background: rgba(245, 240, 232, 0.03);
      border: 1px solid rgba(245, 240, 232, 0.08);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .addr-form__title {
      font-family: var(--font-display);
      font-size: 0.9rem;
      letter-spacing: 0.14em;
      color: var(--cream);
      margin-bottom: 1.25rem;
    }

    .addr-form__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .addr-form__field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.9rem;

      label {
        font-family: var(--font-sans);
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        color: var(--muted);
        text-transform: uppercase;
      }

      input {
        background: rgba(245, 240, 232, 0.04);
        border: 1px solid rgba(245, 240, 232, 0.12);
        color: var(--cream);
        font-family: var(--font-sans);
        font-size: 0.875rem;
        padding: 0.6rem 0.75rem;
        outline: none;
        transition: border-color 0.2s;

        &::placeholder { color: rgba(245, 240, 232, 0.25); }
        &:focus { border-color: rgba(201, 168, 76, 0.5); }
      }
    }

    .addr-form__field--sm { grid-column: span 1; }

    .addr-form__default {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      margin-bottom: 1.25rem;
      font-family: var(--font-sans);
      font-size: 0.82rem;
      color: var(--muted);

      input[type=checkbox] { width: 14px; height: 14px; cursor: pointer; accent-color: var(--gold); }
    }

    .addr-form__error {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: #e07070;
      margin-bottom: 1rem;
    }

    .addr-form__actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .addr-form__save {
      font-family: var(--font-display);
      font-size: 0.8rem;
      letter-spacing: 0.14em;
      background: var(--gold);
      color: var(--bg);
      border: none;
      padding: 0.6rem 1.4rem;
      cursor: pointer;
      transition: opacity 0.2s;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .addr-form__cancel {
      font-family: var(--font-sans);
      font-size: 0.82rem;
      color: var(--muted);
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.2s;
      &:hover { color: var(--cream); }
    }

    /* ── Address cards ───────────────────────────────────────── */
    .addr-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }

    .addr-card {
      border: 1px solid rgba(245, 240, 232, 0.1);
      padding: 1.1rem 1.25rem;
      position: relative;
      transition: border-color 0.2s;
      &:hover { border-color: rgba(245, 240, 232, 0.2); }
    }

    .addr-card--default {
      border-color: rgba(201, 168, 76, 0.35);
    }

    .addr-card__badge {
      display: inline-block;
      font-family: var(--font-display);
      font-size: 0.6rem;
      letter-spacing: 0.14em;
      color: var(--gold);
      border: 1px solid rgba(201, 168, 76, 0.4);
      padding: 0.15rem 0.5rem;
      margin-bottom: 0.75rem;
    }

    .addr-card__name {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--cream);
      margin-bottom: 0.3rem;
    }

    .addr-card__lines {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 0.25rem;
    }

    .addr-card__phone {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
      margin-top: 0.5rem;
    }

    .addr-card__actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(245, 240, 232, 0.06);
    }

    .addr-card__act {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      color: var(--muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: color 0.2s;
      &:hover { color: var(--cream); }
    }

    .addr-card__act--danger:hover { color: #e07070; }

    /* ── Preferences ─────────────────────────────────────────── */
    .pref-section {
      border-top: 1px solid rgba(245, 240, 232, 0.08);
      padding-top: 1.5rem;
    }

    .pref-section__label {
      font-family: var(--font-display);
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      color: var(--muted);
      margin-bottom: 1rem;
    }

    /* ── Profile tab ─────────────────────────────────────────── */
    .prof-section {
      border-top: 1px solid rgba(245, 240, 232, 0.08);
      padding: 1.4rem 0;
      &:first-child { border-top: none; }
    }

    .prof-label {
      display: block;
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.18em;
      color: var(--muted);
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }

    .prof-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .prof-row--mt { margin-top: 0.6rem; }

    .prof-value {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--cream);
      flex: 1;
    }

    .prof-input {
      flex: 1;
      background: rgba(245, 240, 232, 0.04);
      border: 1px solid rgba(245, 240, 232, 0.12);
      color: var(--cream);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      padding: 0.55rem 0.75rem;
      outline: none;
      transition: border-color 0.2s;
      &::placeholder { color: rgba(245, 240, 232, 0.25); }
      &:focus { border-color: rgba(201, 168, 76, 0.5); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .prof-input--otp { max-width: 160px; flex: none; letter-spacing: 0.2em; }

    .prof-save-btn {
      font-family: var(--font-display);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      background: var(--gold);
      color: var(--bg);
      border: none;
      padding: 0.55rem 1.1rem;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.2s;
      flex-shrink: 0;
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }

    .prof-change-btn {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      color: var(--gold);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: opacity 0.2s;
      white-space: nowrap;
      &:hover { opacity: 0.75; }
    }

    .prof-cancel {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      margin-top: 0.5rem;
      display: block;
      &:hover { color: var(--cream); }
    }

    .prof-otp-sent {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: #7ec87e;
      white-space: nowrap;
    }

    .prof-otp-block { display: flex; flex-direction: column; }

    .prof-pw-form {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-width: 360px;
    }

    .prof-msg {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      color: #e07070;
      margin-top: 0.5rem;
    }
    .prof-msg--ok { color: #7ec87e; }

    /* ── Change Password Modal ───────────────────────────────── */
    .pw-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(13, 13, 13, 0.7);
      backdrop-filter: blur(6px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeUp 0.18s ease;
    }

    .pw-modal {
      background: var(--surface);
      border: 1px solid rgba(201, 168, 76, 0.18);
      width: 100%;
      max-width: 400px;
      padding: 1.75rem;
    }

    .pw-modal__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .pw-modal__title {
      font-family: var(--font-display);
      font-size: 0.95rem;
      letter-spacing: 0.18em;
      color: var(--cream);
    }

    .pw-modal__close {
      color: var(--muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      transition: color 0.2s;
      &:hover { color: var(--cream); }
    }

    .pw-modal__body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .pw-modal__field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        font-family: var(--font-sans);
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        color: var(--muted);
        text-transform: uppercase;
      }

      input {
        background: rgba(245, 240, 232, 0.04);
        border: 1px solid rgba(245, 240, 232, 0.12);
        color: var(--cream);
        font-family: var(--font-sans);
        font-size: 0.875rem;
        padding: 0.6rem 0.75rem;
        outline: none;
        transition: border-color 0.2s;
        &::placeholder { color: rgba(245, 240, 232, 0.25); }
        &:focus { border-color: rgba(201, 168, 76, 0.5); }
      }
    }

    .pw-modal__msg {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      color: #e07070;
      margin: 0;
    }
    .pw-modal__msg--ok { color: #7ec87e; }

    .pw-modal__submit {
      font-family: var(--font-display);
      font-size: 0.8rem;
      letter-spacing: 0.14em;
      background: var(--gold);
      color: var(--bg);
      border: none;
      padding: 0.65rem 1.5rem;
      cursor: pointer;
      align-self: flex-start;
      transition: opacity 0.2s;
      margin-top: 0.25rem;
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }

    /* ── Pincode status + disabled fields ───────────────────── */
    .addr-form__label-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .addr-form__pin-spinner {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 1.5px solid rgba(245, 240, 232, 0.15);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: pinSpin 0.6s linear infinite;
      flex-shrink: 0;
    }

    @keyframes pinSpin {
      to { transform: rotate(360deg); }
    }

    .addr-form__pin-status {
      font-size: 0.68rem;
      letter-spacing: 0.04em;
      font-family: var(--font-sans);
    }
    .addr-form__pin-status--ok  { color: #7ec87e; }
    .addr-form__pin-status--err { color: #e07070; }

    .addr-form__field input:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ── Mobile nav dropdown (hidden on desktop) ────────────── */
    .acct__nav-mob { display: none; }

    /* ── Mobile ──────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .acct {
        padding: 6.5rem 1.25rem 5rem;
      }

      .acct__layout {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .acct__sidebar {
        position: static;
        display: grid;
        grid-template-areas: "profile signout" "dropdown dropdown";
        grid-template-columns: 1fr auto;
        align-items: start;
        margin-bottom: 1.5rem;
      }

      .acct__profile {
        grid-area: profile;
        padding-bottom: 0.5rem;
        border-bottom: none;
        margin-bottom: 0;
      }

      /* Hide desktop nav on mobile */
      .acct__nav { display: none; }

      /* Show mobile dropdown */
      .acct__nav-mob {
        grid-area: dropdown;
        display: block;
        position: relative;
      }

      .acct__nav-mob-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.7rem 0.9rem;
        background: rgba(245, 240, 232, 0.04);
        border: 1px solid rgba(245, 240, 232, 0.12);
        color: var(--cream);
        font-family: var(--font-sans);
        font-size: 0.875rem;
        cursor: pointer;
        transition: border-color 0.2s;
        &:hover { border-color: rgba(201, 168, 76, 0.35); }
      }

      .acct__nav-mob-trigger-label {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        svg { flex-shrink: 0; stroke: var(--gold); }
      }

      .acct__nav-mob-chevron {
        flex-shrink: 0;
        transition: transform 0.2s ease;
        stroke: var(--gold);
      }
      .acct__nav-mob-chevron--open { transform: rotate(180deg); }

      .acct__nav-mob-options {
        position: absolute;
        top: calc(100% + 2px);
        left: 0;
        right: 0;
        background: var(--surface);
        border: 1px solid rgba(245, 240, 232, 0.12);
        z-index: 200;
        display: flex;
        flex-direction: column;
        animation: fadeUp 0.15s ease;
      }

      .acct__nav-mob-opt {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.6rem;
        padding: 0.75rem 0.9rem;
        background: none;
        border: none;
        border-bottom: 1px solid rgba(245, 240, 232, 0.06);
        color: var(--muted);
        text-decoration: none;
        font-family: var(--font-sans);
        font-size: 0.875rem;
        cursor: pointer;
        text-align: left;
        transition: color 0.15s, background 0.15s;
        &:last-child { border-bottom: none; }
        &:hover, &:active { color: var(--cream); background: rgba(245, 240, 232, 0.05); }
      }

      .acct__nav-mob-opt svg { flex-shrink: 0; stroke: currentColor; }

      .acct__nav-mob-opt--active {
        color: var(--cream);
        background: rgba(201, 168, 76, 0.06);
        border-left: 2px solid var(--gold);
        padding-left: calc(0.9rem - 2px);
        svg { stroke: var(--gold); }
      }

      .acct__signout {
        grid-area: signout;
        margin-top: 0;
        padding: 0.6rem 0;
        font-size: 0.78rem;
        align-self: start;
      }

      .addr-form__row { grid-template-columns: 1fr; }
    }
  `],
})
export class AccountComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly wishlistService = inject(WishlistService);
  readonly addressService = inject(AddressService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly routeParams = toSignal(this.route.params, { initialValue: {} });
  readonly tab = signal<Tab>('profile');
  readonly navOpen = signal(false);

  constructor() {
    const validTabs = new Set<Tab>(['profile', 'wishlist', 'addresses', 'preferences']);
    effect(() => {
      const t = (this.routeParams() as Record<string, string>)['tab'] as Tab;
      this.tab.set(validTabs.has(t) ? t : 'profile');
    });
  }
  readonly tabLabel = computed(() => {
    const labels: Record<Tab, string> = {
      profile: 'Profile', wishlist: 'Wishlist',
      addresses: 'Addresses', preferences: 'Preferences',
    };
    return labels[this.tab()];
  });

  // ── Profile signals ───────────────────────────────────────────────────────
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

  readonly pwCurrent  = signal('');
  readonly pwNew      = signal('');
  readonly pwConfirm  = signal('');
  readonly pwSaving   = signal(false);
  readonly pwMsg      = signal<string | null>(null);
  readonly showPwModal = signal(false);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly form = signal<AddressFormData>(emptyForm());
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly pincodeStatus = signal<'idle' | 'loading' | 'resolved' | 'error'>('idle');

  private pincodeTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.addressService.load();
  }

  @HostListener('document:click')
  onDocClick(): void { this.navOpen.set(false); }

  setTab(t: Tab): void {
    this.router.navigate(['/account', t]);
    this.closeForm();
  }

  selectMobileTab(t: Tab): void {
    this.setTab(t);
    this.navOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  removeWishlist(productId: string, skuId: string): void {
    this.wishlistService.toggle(productId, skuId);
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.form.set(emptyForm());
    this.formError.set('');
    this.pincodeStatus.set('idle');
    this.showForm.set(true);
  }

  openEditForm(addr: Address): void {
    this.editingId.set(addr.id);
    this.form.set({
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 ?? undefined,
      landmark: addr.landmark ?? undefined,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
    });
    this.formError.set('');
    this.pincodeStatus.set('resolved');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.pincodeStatus.set('idle');
    if (this.pincodeTimer) { clearTimeout(this.pincodeTimer); this.pincodeTimer = null; }
  }

  onPincodeInput(value: string): void {
    this.form.update(f => ({ ...f, pincode: value }));
    if (this.pincodeTimer) { clearTimeout(this.pincodeTimer); this.pincodeTimer = null; }
    if (value.length < 6) {
      this.pincodeStatus.set('idle');
      this.form.update(f => ({ ...f, city: '', state: '' }));
      return;
    }
    this.pincodeStatus.set('loading');
    this.pincodeTimer = setTimeout(() => this.fetchLocation(value), 400);
  }

  private fetchLocation(pincode: string): void {
    this.http.get<{ success: boolean; data: { city: string; state: string } }>(`${this.apiUrl}/pincode/${pincode}`).subscribe({
      next: (res) => {
        this.form.update(f => ({ ...f, city: res.data.city, state: res.data.state }));
        this.pincodeStatus.set('resolved');
      },
      error: () => this.pincodeStatus.set('error'),
    });
  }

  // ── Profile methods ───────────────────────────────────────────────────────

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

  ngOnDestroy(): void {
    if (this.pincodeTimer) clearTimeout(this.pincodeTimer);
  }

  submitAddress(): void {
    const f = this.form();
    if (!f.name || !f.phone || !f.line1 || !f.city || !f.state || !f.pincode) {
      this.formError.set('Please fill in all required fields.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const payload = { ...f, line2: f.line2 || undefined, landmark: f.landmark || undefined } as AddressFormData;
    const id = this.editingId();
    const req$ = id
      ? this.addressService.update(id, payload)
      : this.addressService.create(payload);

    req$.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }

  setDefault(id: string): void {
    this.addressService.setDefault(id).subscribe();
  }

  removeAddress(id: string): void {
    this.addressService.remove(id).subscribe();
  }
}
