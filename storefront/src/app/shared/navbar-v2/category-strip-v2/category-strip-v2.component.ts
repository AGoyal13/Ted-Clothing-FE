import {
  Component,
  Input,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { NavCategory } from '../../../core/models/category.model';

@Component({
  selector: 'app-category-strip-v2',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './category-strip-v2.component.html',
  styleUrl: './category-strip-v2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryStripV2Component implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  @Input() navTree: NavCategory[] = [];
  @Input() stripScrolled = false;

  readonly activeCategory = signal<NavCategory | null>(null);
  readonly activeGroupSlug = signal<string | null>(null);
  readonly drawerOpen = signal(false);

  private swipeStartY = 0;
  private swipeStartX = 0;

  // All direct children of the active top-level category
  readonly allChildren = computed<NavCategory[]>(() =>
    this.activeCategory()?.children ?? []
  );

  // Sub-categories (level 3) of whichever group is currently selected in the left panel
  readonly activeGroupLinks = computed<NavCategory[]>(() => {
    const slug = this.activeGroupSlug();
    if (!slug) return [];
    return this.allChildren().find(c => c.slug === slug)?.children ?? [];
  });

  readonly activeGroupName = computed<string>(() => {
    const slug = this.activeGroupSlug();
    if (!slug) return '';
    return this.allChildren().find(c => c.slug === slug)?.name ?? '';
  });

  private readonly CATEGORY_COLORS: Record<string, string> = {
    women: '#c8906a',
    men: '#3e5060',
    kids: '#d88040',
    home: '#a89870',
    beauty: '#b87898',
    sport: '#2e5c34',
    sale: '#8a2218',
  };

  isSale(slug: string): boolean {
    return slug?.toLowerCase() === 'sale';
  }

  getCategoryBg(slug: string): string {
    return this.CATEGORY_COLORS[slug?.toLowerCase()] ?? 'var(--surface)';
  }

  hasChildren(cat: NavCategory): boolean {
    return (cat.children?.length ?? 0) > 0;
  }

  openDrawer(cat: NavCategory): void {
    if (this.activeCategory()?.slug === cat.slug && this.drawerOpen()) {
      this.closeDrawer();
      return;
    }
    this.activeCategory.set(cat);
    // Auto-select the first child that itself has sub-categories (level-3 group)
    const firstGroup = (cat.children ?? []).find(c => c.children?.length);
    this.activeGroupSlug.set(firstGroup?.slug ?? null);
    this.drawerOpen.set(true);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  setActiveGroup(slug: string): void {
    this.activeGroupSlug.set(slug);
  }

  onSwipeStart(e: TouchEvent): void {
    this.swipeStartY = e.touches[0].clientY;
    this.swipeStartX = e.touches[0].clientX;
  }

  onSwipeMove(e: TouchEvent): void {
    const dy = e.touches[0].clientY - this.swipeStartY;
    const dx = Math.abs(e.touches[0].clientX - this.swipeStartX);
    if (dy > 0 && dy > dx) {
      const panel = e.currentTarget as HTMLElement;
      panel.style.transform = `translateY(${dy}px)`;
      panel.style.transition = 'none';
    }
  }

  onSwipeEnd(e: TouchEvent): void {
    const dy = e.changedTouches[0].clientY - this.swipeStartY;
    const panel = e.currentTarget as HTMLElement;
    panel.style.transform = '';
    panel.style.transition = '';
    if (dy > 64) {
      this.closeDrawer();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }
}
