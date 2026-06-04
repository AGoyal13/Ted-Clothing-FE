import { Component, Input, Output, EventEmitter, signal, computed, PLATFORM_ID, inject, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { SizeGuide, SizeGuideMeasurement } from '../../../../core/models/product.model';

@Component({
  selector: 'pdp-size-guide',
  standalone: true,
  imports: [NgClass],
  templateUrl: './pdp-size-guide.component.html',
  styleUrl: './pdp-size-guide.component.scss',
})
export class PdpSizeGuideComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @Input({ required: true }) guide!: SizeGuide;
  @Output() closed = new EventEmitter<void>();

  readonly unit = signal<'in' | 'cm'>('in');

  // Convert an inch string like "36-37" or "24.0" to cm
  toCm(val: string): string {
    return val
      .split(/[-–]/)
      .map(v => {
        const n = parseFloat(v.trim());
        return isNaN(n) ? v.trim() : (n * 2.54).toFixed(1);
      })
      .join('–');
  }

  displayValue(val: string): string {
    return this.unit() === 'cm' ? this.toCm(val) : val;
  }

  close(): void {
    this.closed.emit();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('sg-overlay')) {
      this.close();
    }
  }
}
