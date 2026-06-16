import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ProductImagePreviewData {
  images: string[];
  index: number;
}

/**
 * Read-only preview of how a product image renders on the storefront. PLP cards and the PDP
 * gallery both use a 3:4 frame with object-fit:cover (centered), and the backend already stores
 * images at 3:4 (1200×1600), so this is exactly what shoppers see — unlike the tiny square
 * thumbnails in the admin, which center-crop the 3:4 image and misrepresent the framing.
 */
@Component({
  selector: 'app-product-image-preview-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Storefront preview</h2>
    <mat-dialog-content>
      <p class="hint">
        How this image appears to shoppers. Product cards (PLP) and the product page (PDP) both
        use a <strong>3:4 portrait frame</strong>; the stored image is already 3:4, so nothing is
        cropped further on the site.
      </p>

      <div class="preview-row">
        <div class="preview-col">
          <div class="frame frame--plp">
            <img [src]="current()" alt="PLP preview" />
          </div>
          <span class="caption">Product card · PLP</span>
        </div>

        <div class="preview-col">
          <div class="frame frame--pdp">
            <img [src]="current()" alt="PDP preview" />
          </div>
          <span class="caption">Product page · PDP</span>
        </div>
      </div>

      @if (data.images.length > 1) {
        <div class="nav">
          <button mat-icon-button (click)="prev()" aria-label="Previous image"><mat-icon>chevron_left</mat-icon></button>
          <span class="nav-count">{{ idx() + 1 }} / {{ data.images.length }}</span>
          <button mat-icon-button (click)="next()" aria-label="Next image"><mat-icon>chevron_right</mat-icon></button>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { max-width: 560px; }
    .hint { font-size: 13px; color: rgba(0,0,0,.7); margin: 4px 0 16px; line-height: 1.5; }
    .preview-row { display: flex; gap: 24px; align-items: flex-end; justify-content: center; }
    .preview-col { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    /* Both frames mirror the storefront .aspect-3-4: 3/4, object-fit cover, centered */
    .frame { aspect-ratio: 3 / 4; overflow: hidden; border-radius: 4px; border: 1px solid #e0e0e0; background: #fafafa; }
    .frame img { width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block; }
    .frame--plp { width: 150px; }
    .frame--pdp { width: 280px; }
    .caption { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; }
    .nav { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; }
    .nav-count { font-size: 13px; color: #666; min-width: 48px; text-align: center; }
  `],
})
export class ProductImagePreviewDialogComponent {
  data: ProductImagePreviewData = inject(MAT_DIALOG_DATA);
  idx = signal(this.data.index ?? 0);

  current(): string { return this.data.images[this.idx()]; }
  prev() { this.idx.set((this.idx() - 1 + this.data.images.length) % this.data.images.length); }
  next() { this.idx.set((this.idx() + 1) % this.data.images.length); }
}
