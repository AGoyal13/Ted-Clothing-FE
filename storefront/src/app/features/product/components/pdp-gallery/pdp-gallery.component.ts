import {
  Component,
  Input,
  OnDestroy,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'pdp-gallery',
  standalone: true,
  imports: [],
  templateUrl: './pdp-gallery.component.html',
  styleUrl: './pdp-gallery.component.scss',
})
export class PdpGalleryComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _imgs = signal<string[]>([]);

  @Input() set images(v: string[]) {
    this._imgs.set(v);
    this.selectedThumbIndex.set(0);
  }

  @Input() title = '';

  readonly selectedThumbIndex = signal(0);
  readonly fading = signal(false);
  readonly lightboxOpen = signal(false);

  private touchStartX = 0;
  private lightboxKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  readonly imgs = computed(() => this._imgs());
  readonly currentImage = computed(() => {
    const imgs = this._imgs();
    return imgs[this.selectedThumbIndex()] ?? imgs[0] ?? null;
  });

  selectThumb(index: number): void {
    if (index === this.selectedThumbIndex()) return;
    this.fading.set(true);
    setTimeout(() => {
      this.selectedThumbIndex.set(index);
      this.fading.set(false);
    }, 180);
  }

  prev(): void {
    const len = this._imgs().length;
    if (len < 2) return;
    this.selectedThumbIndex.update(i => (i - 1 + len) % len);
  }

  next(): void {
    const len = this._imgs().length;
    if (len < 2) return;
    this.selectedThumbIndex.update(i => (i + 1) % len);
  }

  openLightbox(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.lightboxOpen.set(true);
    document.body.style.overflow = 'hidden';
    this.lightboxKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeLightbox();
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'ArrowRight') this.next();
    };
    document.addEventListener('keydown', this.lightboxKeyHandler);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    document.body.style.overflow = '';
    if (this.lightboxKeyHandler) {
      document.removeEventListener('keydown', this.lightboxKeyHandler);
      this.lightboxKeyHandler = null;
    }
  }

  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
  }

  ngOnDestroy(): void {
    this.closeLightbox();
  }
}
