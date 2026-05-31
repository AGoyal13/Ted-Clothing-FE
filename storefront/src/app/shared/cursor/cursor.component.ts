import {
  Component,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  ElementRef,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-cursor',
  standalone: true,
  templateUrl: './cursor.component.html',
  styleUrl: './cursor.component.scss',
})
export class CursorComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  readonly visible = signal(false);
  readonly hovering = signal(false);

  private dotEl = viewChild<ElementRef<HTMLDivElement>>('dot');
  private ringEl = viewChild<ElementRef<HTMLDivElement>>('ring');

  private mouseX = 0;
  private mouseY = 0;
  private ringX = 0;
  private ringY = 0;
  private rafId = 0;

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    if (!this.visible()) this.visible.set(true);
    const dot = this.dotEl()?.nativeElement;
    if (dot) {
      dot.style.left = `${this.mouseX}px`;
      dot.style.top = `${this.mouseY}px`;
    }
  };

  private onMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], input, select, textarea')) {
      this.hovering.set(true);
    }
  };

  private onMouseOut = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], input, select, textarea')) {
      this.hovering.set(false);
    }
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Only show custom cursor on non-touch devices
    if (window.matchMedia('(hover: none)').matches) return;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseover', this.onMouseOver);
    document.addEventListener('mouseout', this.onMouseOut);

    const animate = () => {
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      this.ringX = lerp(this.ringX, this.mouseX, 0.12);
      this.ringY = lerp(this.ringY, this.mouseY, 0.12);

      const ring = this.ringEl()?.nativeElement;
      if (ring) {
        ring.style.left = `${this.ringX}px`;
        ring.style.top = `${this.ringY}px`;
      }

      this.rafId = requestAnimationFrame(animate);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseover', this.onMouseOver);
    document.removeEventListener('mouseout', this.onMouseOut);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
