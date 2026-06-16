import { Pipe, PipeTransform } from '@angular/core';

/** Any object carrying optional per-category focal-point coordinates (0–100). */
export interface FocalPoint {
  focalX?: number | null;
  focalY?: number | null;
}

/**
 * Maps a category's focal point to a CSS `object-position` value for nav-card images.
 * Defaults reproduce the previous hardcoded `object-position: top center` exactly
 * (x = 50%, y = 0%), so categories without a configured focal point are unchanged.
 */
@Pipe({ name: 'focalPosition', standalone: true })
export class FocalPositionPipe implements PipeTransform {
  transform(c: FocalPoint | null | undefined): string {
    const x = c?.focalX ?? 50;
    const y = c?.focalY ?? 0;
    return `${x}% ${y}%`;
  }
}
