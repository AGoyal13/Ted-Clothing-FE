import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';

interface Swatch { hex: string; name: string; }

const PALETTE: Swatch[] = [
  // Whites & Creams
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#FFF8EE', name: 'Ivory' },
  { hex: '#F5F0DC', name: 'Cream' },
  { hex: '#EDE0C8', name: 'Linen' },
  { hex: '#D4C4A8', name: 'Sand' },
  { hex: '#C8AE90', name: 'Almond' },
  { hex: '#B89878', name: 'Wheat' },
  { hex: '#A07850', name: 'Caramel' },
  // Tans & Browns
  { hex: '#8B6030', name: 'Camel' },
  { hex: '#7A4818', name: 'Toffee' },
  { hex: '#5C3010', name: 'Walnut' },
  { hex: '#3E2008', name: 'Chocolate' },
  { hex: '#281205', name: 'Espresso' },
  // Grays
  { hex: '#F5F5F5', name: 'Light Grey' },
  { hex: '#E0E0E0', name: 'Silver' },
  { hex: '#BDBDBD', name: 'Grey' },
  { hex: '#9E9E9E', name: 'Medium Grey' },
  { hex: '#757575', name: 'Dark Grey' },
  { hex: '#616161', name: 'Dim Grey' },
  { hex: '#424242', name: 'Charcoal' },
  { hex: '#212121', name: 'Off Black' },
  { hex: '#000000', name: 'Black' },
  // Blues & Navys
  { hex: '#1A1A2E', name: 'Midnight' },
  { hex: '#16213E', name: 'Deep Navy' },
  { hex: '#1A237E', name: 'Navy' },
  { hex: '#1565C0', name: 'Royal Blue' },
  { hex: '#1976D2', name: 'Blue' },
  { hex: '#2196F3', name: 'Cornflower' },
  { hex: '#64B5F6', name: 'Sky Blue' },
  { hex: '#E3F2FD', name: 'Baby Blue' },
  // Teals & Greens
  { hex: '#26A69A', name: 'Teal' },
  { hex: '#00796B', name: 'Dark Teal' },
  { hex: '#1B5E20', name: 'Deep Green' },
  { hex: '#2E7D32', name: 'Forest' },
  { hex: '#388E3C', name: 'Green' },
  { hex: '#558B2F', name: 'Olive Green' },
  { hex: '#8BC34A', name: 'Lime Green' },
  { hex: '#DCEDC8', name: 'Mint' },
  // Yellows & Golds & Oranges
  { hex: '#827717', name: 'Olive' },
  { hex: '#F57F17', name: 'Dark Amber' },
  { hex: '#F9A825', name: 'Amber' },
  { hex: '#C9A84C', name: 'Mustard' },
  { hex: '#FFB300', name: 'Gold' },
  { hex: '#FDD835', name: 'Yellow' },
  { hex: '#FF9800', name: 'Tangerine' },
  { hex: '#FF7043', name: 'Burnt Orange' },
  // Reds & Burgundy
  { hex: '#BF360C', name: 'Rust' },
  { hex: '#FF5722', name: 'Orange Red' },
  { hex: '#F44336', name: 'Red' },
  { hex: '#D32F2F', name: 'Cherry' },
  { hex: '#B71C1C', name: 'Dark Red' },
  { hex: '#7F0000', name: 'Maroon' },
  { hex: '#880E4F', name: 'Burgundy' },
  { hex: '#4A0010', name: 'Deep Burgundy' },
  // Pinks & Purples
  { hex: '#E91E63', name: 'Pink' },
  { hex: '#F48FB1', name: 'Light Pink' },
  { hex: '#FCE4EC', name: 'Blush' },
  { hex: '#9C27B0', name: 'Purple' },
  { hex: '#7B1FA2', name: 'Deep Purple' },
  { hex: '#4A148C', name: 'Violet' },
  { hex: '#673AB7', name: 'Amethyst' },
  { hex: '#EDE7F6', name: 'Lavender' },
];

@Component({
  selector: 'app-color-swatch-picker',
  standalone: true,
  imports: [],
  template: `
    <div class="csp">
      <div class="csp__row">
        <button
          class="csp__trigger"
          [class.csp__trigger--empty]="!_hex"
          [style.background]="_hex || null"
          (click)="toggle()"
          type="button"
          [title]="_hex || 'Pick a colour'">
          @if (!_hex) {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
            </svg>
          }
        </button>
        <input
          class="csp__input"
          [value]="_hex"
          (input)="onInput($any($event.target).value)"
          placeholder="#1a237e"
          spellcheck="false"
          maxlength="7"
          autocomplete="off" />
      </div>

      @if (open) {
        <div class="csp__panel" [style.top.px]="panelPos.top" [style.left.px]="panelPos.left">
          <div class="csp__grid">
            @for (c of palette; track c.hex) {
              <button
                class="csp__swatch"
                [class.csp__swatch--active]="isActive(c.hex)"
                [style.background]="c.hex"
                [title]="c.name + '  ' + c.hex"
                (click)="select(c.hex)"
                type="button"
                [attr.aria-label]="c.name">
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .csp { position: relative; }

    .csp__row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .csp__trigger {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9e9e9e;

      &--empty { background: #f5f5f5 !important; }

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22);
        border-color: rgba(0, 0, 0, 0.35);
      }
    }

    .csp__input {
      flex: 1;
      height: 40px;
      padding: 0 12px;
      border: 1px solid rgba(0, 0, 0, 0.23);
      border-radius: 4px;
      font-family: 'Roboto Mono', 'Courier New', monospace;
      font-size: 13px;
      letter-spacing: 0.04em;
      color: rgba(0, 0, 0, 0.87);
      background: transparent;
      outline: none;
      transition: border-color 0.2s, border-width 0.1s;

      &:focus {
        border-color: #1a237e;
        border-width: 2px;
      }

      &::placeholder { color: rgba(0, 0, 0, 0.35); }
    }

    /* Panel uses position:fixed so it escapes dialog overflow/stacking */
    .csp__panel {
      position: fixed;
      z-index: 1400;
      background: #fff;
      border-radius: 8px;
      box-shadow:
        0 5px 5px -3px rgba(0, 0, 0, 0.2),
        0 8px 10px 1px rgba(0, 0, 0, 0.14),
        0 3px 14px 2px rgba(0, 0, 0, 0.12);
      padding: 12px;
      width: 266px;
    }

    .csp__grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 6px;
    }

    .csp__swatch {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 1.5px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: transform 0.13s ease, box-shadow 0.13s ease;

      &:hover {
        transform: scale(1.3);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
        border-color: rgba(0, 0, 0, 0.25);
        z-index: 1;
        position: relative;
      }

      &--active {
        transform: scale(1.15);
        box-shadow:
          0 0 0 2px #fff,
          0 0 0 4px #1a237e;
        border-color: transparent;
      }
    }
  `],
})
export class ColorSwatchPickerComponent {
  // Separate internal state from @Input() so Angular's CD cannot clobber
  // local mutations (select / onInput) by re-applying the parent binding.
  _hex = '';

  @Input() set hex(v: string) { this._hex = v ?? ''; }
  @Output() hexChange = new EventEmitter<string>();

  open = false;
  panelPos = { top: 0, left: 0 };
  readonly palette = PALETTE;

  private readonly el = inject(ElementRef);

  toggle(): void {
    if (!this.open) {
      const trigger = (this.el.nativeElement as HTMLElement).querySelector('.csp__trigger')!;
      const rect = trigger.getBoundingClientRect();
      this.panelPos = { top: rect.bottom + 6, left: rect.left };
    }
    this.open = !this.open;
  }

  select(value: string): void {
    this._hex = value;
    this.hexChange.emit(value);
    this.open = false;
  }

  onInput(value: string): void {
    this._hex = value;
    this.hexChange.emit(value);
  }

  isActive(swatchHex: string): boolean {
    return this._hex.toLowerCase() === swatchHex.toLowerCase();
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(e: MouseEvent): void {
    if (this.open && !(this.el.nativeElement as HTMLElement).contains(e.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.open = false;
  }
}
