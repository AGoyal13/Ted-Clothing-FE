import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface FocalDialogData {
  imageUrl: string;
  focalX: number;
  focalY: number;
}
export interface FocalDialogResult {
  focalX: number;
  focalY: number;
}

/**
 * Large focal-point picker. The admin clicks/drags on the full image to choose the point
 * that must stay visible when the storefront cover-crops the image into nav cards.
 * Live previews mirror the real storefront card ratios so the crop is unambiguous.
 */
@Component({
  selector: 'app-category-focal-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Adjust focal point</h2>
    <mat-dialog-content>
      <p class="hint">
        <mat-icon>touch_app</mat-icon>
        Click or drag anywhere on the image to mark the part that should stay visible.
        Cards crop around this point.
      </p>

      <div class="focal-layout">
        <!-- Editable full image -->
        <div class="focal-stage"
             (pointerdown)="onDown($event)"
             (pointermove)="onMove($event)"
             (pointerup)="onUp()"
             (pointerleave)="onUp()">
          <img [src]="data.imageUrl" class="focal-stage-img" alt="Category image" draggable="false" />
          <!-- crosshair guides -->
          <span class="focal-line focal-line--v" [style.left.%]="focalX()"></span>
          <span class="focal-line focal-line--h" [style.top.%]="focalY()"></span>
          <span class="focal-dot" [style.left.%]="focalX()" [style.top.%]="focalY()"></span>
        </div>

        <!-- Live crop previews at real storefront card ratios -->
        <div class="focal-previews">
          <div class="preview-label">Live preview</div>
          @for (p of previews; track p.label) {
            <div class="preview-item">
              <div class="preview-frame" [style.aspect-ratio]="p.ratio">
                <img [src]="data.imageUrl"
                     [style.object-position]="objectPosition()"
                     alt="" aria-hidden="true" />
              </div>
              <span class="preview-caption">{{ p.label }}</span>
            </div>
          }
        </div>
      </div>

      <div class="coords">
        Focal point: <strong>{{ focalX() }}%</strong> / <strong>{{ focalY() }}%</strong>
        <button type="button" mat-button (click)="reset()">Reset to top-center</button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="apply()">Apply</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { max-width: 640px; }
    .hint { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(0,0,0,.7); margin: 4px 0 14px; }
    .hint mat-icon { color: #1976d2; }
    .focal-layout { display: flex; gap: 20px; align-items: flex-start; }
    .focal-stage { position: relative; flex-shrink: 0; cursor: crosshair; touch-action: none; user-select: none; line-height: 0; border-radius: 6px; overflow: hidden; border: 1px solid #e0e0e0; }
    .focal-stage-img { display: block; max-width: 340px; max-height: 64vh; width: auto; height: auto; }
    .focal-line { position: absolute; background: rgba(255,255,255,.85); box-shadow: 0 0 0 .5px rgba(0,0,0,.4); pointer-events: none; }
    .focal-line--v { top: 0; bottom: 0; width: 1px; transform: translateX(-.5px); }
    .focal-line--h { left: 0; right: 0; height: 1px; transform: translateY(-.5px); }
    .focal-dot { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: rgba(25,118,210,.25); border: 2px solid #1976d2; transform: translate(-50%,-50%); pointer-events: none; box-shadow: 0 0 0 1px #fff, 0 1px 3px rgba(0,0,0,.4); }
    .focal-previews { display: flex; flex-direction: column; gap: 10px; }
    .preview-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #999; }
    .preview-item { display: flex; flex-direction: column; gap: 3px; }
    .preview-frame { width: 132px; overflow: hidden; border-radius: 4px; border: 1px solid #e0e0e0; background: #fafafa; }
    .preview-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .preview-caption { font-size: 11px; color: #777; }
    .coords { margin-top: 14px; font-size: 13px; color: rgba(0,0,0,.7); display: flex; align-items: center; gap: 8px; }
  `],
})
export class CategoryFocalDialogComponent {
  private ref = inject(MatDialogRef<CategoryFocalDialogComponent, FocalDialogResult>);
  data: FocalDialogData = inject(MAT_DIALOG_DATA);

  focalX = signal(this.data.focalX ?? 50);
  focalY = signal(this.data.focalY ?? 0);
  private dragging = false;

  // Every storefront category card is now a single 4:5 portrait, so one preview is truthful.
  readonly previews = [
    { label: 'Card crop (4:5) — used on every storefront card', ratio: '4 / 5' },
  ];

  objectPosition(): string {
    return `${this.focalX()}% ${this.focalY()}%`;
  }

  onDown(e: PointerEvent) {
    this.dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this.update(e);
  }
  onMove(e: PointerEvent) { if (this.dragging) this.update(e); }
  onUp() { this.dragging = false; }
  reset() { this.focalX.set(50); this.focalY.set(0); }
  apply() { this.ref.close({ focalX: this.focalX(), focalY: this.focalY() }); }

  private update(e: PointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));
    this.focalX.set(clamp(((e.clientX - rect.left) / rect.width) * 100));
    this.focalY.set(clamp(((e.clientY - rect.top) / rect.height) * 100));
  }
}
