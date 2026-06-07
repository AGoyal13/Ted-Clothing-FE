import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavCategory } from '../../../core/models/category.model';

interface MegaGroup {
  slug: string;
  links: NavCategory[];
}

@Component({
  selector: 'navbar-mega-v2',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mega-menu-v2.component.html',
  styleUrl: './mega-menu-v2.component.scss',
})
export class MegaMenuV2Component {
  @Input() root!: NavCategory;
  @Input() visible = false;
  @Output() enter = new EventEmitter<void>();
  @Output() leave = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  private readonly CATEGORY_COLORS: Record<string, string> = {
    women: '#c8906a',
    men: '#3e5060',
    kids: '#d88040',
    home: '#a89870',
    beauty: '#b87898',
    sport: '#2e5c34',
    sale: '#8a2218',
  };

  getCategoryColor(slug: string): string {
    return this.CATEGORY_COLORS[slug.toLowerCase()] ?? 'var(--surface)';
  }

  isSale(slug: string): boolean {
    return slug.toLowerCase() === 'sale';
  }

  buildGroups(root: NavCategory): MegaGroup[] {
    const groups: MegaGroup[] = [];
    const flat: NavCategory[] = [];

    for (const child of root.children ?? []) {
      if (child.children?.length) {
        // Direct child is itself a parent: it becomes the sole top-level link in its column.
        // The template renders its sub-categories indented below it.
        groups.push({ slug: child.slug, links: [child] });
      } else {
        flat.push(child);
      }
    }

    // Remaining flat direct children go into chunked columns — no headers, same link style
    const chunkSize = 8;
    for (let i = 0; i < flat.length; i += chunkSize) {
      groups.push({ slug: root.slug, links: flat.slice(i, i + chunkSize) });
    }
    return groups;
  }

  getFeaturedItems(root: NavCategory): NavCategory[] {
    const children = root.children ?? [];
    const withImg = children.filter(c => c.imageUrl);
    const pool = withImg.length >= 2 ? withImg : children;
    return pool.slice(0, 3);
  }
}
