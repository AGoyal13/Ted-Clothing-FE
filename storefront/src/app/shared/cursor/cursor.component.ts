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
  template: `
    @if (visible()) {
      <div class="cursor-dot" #dot></div>
      <div class="cursor-ring" #ring [class.cursor--hover]="hovering()"></div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .cursor-dot {
      position: fixed;
      top: 0;
      left: 0;
      width: 8px;
      height: 8px;
      background: var(--gold);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease, background 0.2s ease;
      will-change: transform;
    }

    .cursor-ring {
      position: fixed;
      top: 0;
      left: 0;
      width: 40px;
      height: 40px;
      border: 1.5px solid var(--gold);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      will-change: transform;
      transition: width 0.3s var(--ease-enter),
                  height 0.3s var(--ease-enter),
                  border-color 0.3s ease,
                  opacity 0.3s ease;
      opacity: 0.7;

      &.cursor--hover {
        width: 60px;
        height: 60px;
        border-color: var(--gold-light);
        opacity: 1;
      }
    }

    @media (hover: none) {
      .cursor-dot,
      .cursor-ring {
        display: none;
      }
    }
  `],
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
