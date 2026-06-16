import { Component, Input, Output, EventEmitter, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { ProductImagePreviewDialogComponent } from './product-image-preview-dialog.component';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="upload-root">
      <p class="section-label">Images <span class="count">{{ images().length }} / 12</span></p>

      <div class="thumb-grid">
        @for (url of images(); track url; let i = $index) {
          <div class="thumb">
            <img [src]="url" alt="Product image" loading="lazy"
                 (click)="openPreview(i)" title="Preview on storefront (PLP / PDP)" />
            <div class="thumb-zoom" (click)="openPreview(i)" title="Preview on storefront">
              <mat-icon>zoom_in</mat-icon>
            </div>
            <button class="thumb-del" (click)="removeImage(url)" title="Remove">✕</button>
          </div>
        }

        @if (images().length < 12) {
          <div class="thumb add-tile"
            [class.drag-over]="dragOver()"
            (click)="fileInput.click()"
            (dragover)="onDragOver($event)"
            (dragleave)="dragOver.set(false)"
            (drop)="onDrop($event)">
            @if (uploading()) {
              <mat-spinner diameter="24" />
            } @else {
              <mat-icon>add_photo_alternate</mat-icon>
              <span>Add</span>
            }
          </div>
        }
      </div>

      <p class="hint">JPG / PNG / WebP · max 10 MB each · up to 12 images<br>
        Upload at least <strong>1200 × 1600px (3:4 portrait)</strong> — auto-cropped to 3:4 &amp; converted to WebP. Smaller images look blurry.<br>
        Uploaded automatically, saved with color</p>

      <input #fileInput type="file" accept="image/jpeg,image/png,image/webp"
        multiple hidden (change)="onFileSelected($event)" />
    </div>
  `,
  styles: [`
    .upload-root { display: flex; flex-direction: column; gap: 6px; }
    .section-label { margin: 0; font-size: 13px; font-weight: 500; color: #333; }
    .count { font-weight: 400; color: #999; margin-left: 4px; }

    .thumb-grid { display: flex; flex-wrap: wrap; gap: 8px; }

    .thumb {
      position: relative; width: 80px; height: 80px; border-radius: 6px;
      overflow: hidden; border: 1px solid #e0e0e0; flex-shrink: 0;
    }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: zoom-in; }
    .thumb-zoom {
      position: absolute; bottom: 2px; left: 2px;
      background: rgba(0,0,0,0.55); color: #fff;
      border-radius: 4px; width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      cursor: zoom-in; opacity: 0; transition: opacity .15s;
    }
    .thumb-zoom mat-icon { font-size: 14px; width: 14px; height: 14px; line-height: 14px; }
    .thumb:hover .thumb-zoom { opacity: 1; }
    .thumb-del {
      position: absolute; top: 2px; right: 2px;
      background: rgba(0,0,0,0.55); color: #fff;
      border: none; border-radius: 50%; width: 20px; height: 20px;
      font-size: 10px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; line-height: 1;
    }
    .thumb-del:hover { background: #c62828; }

    .add-tile {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; cursor: pointer; border: 2px dashed #bdbdbd; border-radius: 6px;
      color: #9e9e9e; font-size: 11px; transition: border-color .15s, background .15s;
    }
    .add-tile:hover { border-color: #1a237e; color: #1a237e; background: #f5f5ff; }
    .add-tile.drag-over { border-color: #1a237e; background: #e8eaf6; color: #1a237e; }
    .add-tile mat-icon { font-size: 28px; width: 28px; height: 28px; }

    .hint { margin: 0; font-size: 11px; color: #aaa; line-height: 1.5; }
  `],
})
export class ImageUploadComponent implements OnChanges {
  @Input() productId = '';
  @Input() initialImages: string[] = [];
  @Output() imagesChange = new EventEmitter<string[]>();

  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  images = signal<string[]>([]);
  uploading = signal(false);
  dragOver = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialImages']) {
      this.images.set([...(this.initialImages ?? [])]);
    }
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    this.uploadFiles(files);
  }

  onFileSelected(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    (e.target as HTMLInputElement).value = '';
    this.uploadFiles(files);
  }

  async uploadFiles(files: File[]) {
    const valid = files.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    const remaining = 12 - this.images().length;
    if (!valid.length || remaining <= 0) return;

    const toUpload = valid.slice(0, remaining);
    this.uploading.set(true);

    try {
      const fd = new FormData();
      toUpload.forEach(f => fd.append('files', f));
      const result = await this.api
        .uploadFiles<{ urls: string[] }>(`upload/images?productId=${this.productId}`, fd)
        .toPromise();
      const updated = [...this.images(), ...(result?.urls ?? [])];
      this.images.set(updated);
      this.imagesChange.emit(updated);
    } catch (e: any) {
      this.snack.open(e?.error?.error?.message ?? 'Upload failed', '', { duration: 3000 });
    }

    this.uploading.set(false);
  }

  openPreview(index: number) {
    this.dialog.open(ProductImagePreviewDialogComponent, {
      data: { images: this.images(), index },
      width: '600px',
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  async removeImage(url: string) {
    // Best-effort delete from R2; don't block UI on failure
    this.api.delete(`upload/image?url=${encodeURIComponent(url)}`).subscribe();
    const updated = this.images().filter(u => u !== url);
    this.images.set(updated);
    this.imagesChange.emit(updated);
  }
}
