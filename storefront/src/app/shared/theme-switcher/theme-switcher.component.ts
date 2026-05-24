import {
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ThemeService, ThemeId } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  template: `
    <div class="ts">
      <!-- Trigger: 3 swatches of active theme -->
      <button class="ts__btn" (click)="toggle()" aria-label="Switch theme" [attr.aria-expanded]="open()">
        @for (swatch of activeTheme()?.swatches; track $index) {
          <span class="ts__dot" [style.background]="swatch"></span>
        }
      </button>

      <!-- Dropdown panel -->
      @if (open()) {
        <div class="ts__panel" role="menu">
          <p class="ts__panel-title">SELECT THEME</p>
          <div class="ts__options">
            @for (theme of themeService.themes; track theme.id) {
              <button
                class="ts__option"
                [class.ts__option--active]="themeService.activeId() === theme.id"
                (click)="select(theme.id)"
                role="menuitem"
              >
                <div class="ts__swatches">
                  @for (swatch of theme.swatches; track $index) {
                    <span class="ts__swatch" [style.background]="swatch"></span>
                  }
                </div>
                <span class="ts__option-name">{{ theme.name }}</span>
                <span class="ts__option-sub">{{ theme.subtitle }}</span>
                @if (themeService.activeId() === theme.id) {
                  <span class="ts__check" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  </span>
                }
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ts {
      position: relative;
    }

    .ts__btn {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 6px;
      border: 1px solid transparent;
      transition: border-color 0.2s ease;
      border-radius: 2px;

      &:hover {
        border-color: rgba(201, 168, 76, 0.3);
      }
    }

    .ts__dot {
      display: block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .ts__panel {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 220px;
      background: var(--surface);
      border: 1px solid rgba(201, 168, 76, 0.2);
      padding: 1rem;
      z-index: 200;
      animation: tsSlideIn 0.2s var(--ease-enter) both;
    }

    @keyframes tsSlideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ts__panel-title {
      font-family: var(--font-sans);
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0.25em;
      color: var(--gold);
      margin-bottom: 0.875rem;
    }

    .ts__options {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .ts__option {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 0.625rem;
      padding: 0.625rem 0.75rem;
      border: 1px solid rgba(245, 240, 232, 0.06);
      background: transparent;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;
      text-align: left;
      width: 100%;

      &:hover {
        border-color: rgba(201, 168, 76, 0.25);
        background: rgba(201, 168, 76, 0.04);
      }

      &--active {
        border-color: rgba(201, 168, 76, 0.35);
        background: rgba(201, 168, 76, 0.06);
      }
    }

    .ts__swatches {
      display: flex;
      gap: 2px;
    }

    .ts__swatch {
      display: block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .ts__option-name {
      font-family: var(--font-display);
      font-size: 0.85rem;
      letter-spacing: 0.12em;
      color: var(--cream);
      line-height: 1;
    }

    .ts__option-sub {
      font-family: var(--font-sans);
      font-size: 0.62rem;
      color: var(--muted);
      letter-spacing: 0.06em;
      opacity: 0.8;
    }

    .ts__check {
      color: var(--gold);
      display: flex;
      align-items: center;
    }
  `],
})
export class ThemeSwitcherComponent {
  readonly themeService = inject(ThemeService);
  readonly open = signal(false);
  private readonly elRef = inject(ElementRef);

  activeTheme() {
    return this.themeService.themes.find(t => t.id === this.themeService.activeId());
  }

  toggle(): void {
    this.open.update(v => !v);
  }

  select(id: ThemeId): void {
    this.themeService.setTheme(id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
