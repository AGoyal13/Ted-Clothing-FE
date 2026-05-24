import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeId = 'ivory' | 'parchment';

export interface Theme {
  id: ThemeId;
  name: string;
  subtitle: string;
  swatches: [string, string, string];
}

export const THEMES: Theme[] = [
  {
    id: 'parchment',
    name: 'PARCHMENT',
    subtitle: 'Warm Dark',
    swatches: ['#231d15', '#2e2518', '#d4a843'],
  },
  {
    id: 'ivory',
    name: 'IVORY',
    subtitle: 'Light',
    swatches: ['#f5f0e8', '#ede8df', '#9a7520'],
  },
];

const STORAGE_KEY = 'ted_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly themes = THEMES;
  readonly activeId = signal<ThemeId>('parchment');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const valid = saved && THEMES.some(t => t.id === saved) ? saved : 'parchment';
    this.apply(valid);
  }

  setTheme(id: ThemeId): void {
    this.apply(id);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  private apply(id: ThemeId): void {
    this.activeId.set(id);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('data-theme', id);
    }
  }
}
