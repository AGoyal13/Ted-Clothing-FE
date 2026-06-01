import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavCategory } from '../../../core/models/category.model';

interface MegaGroup { label: string; slug: string; links: NavCategory[]; showBorder: boolean; }

@Component({
  selector: 'navbar-mobile-drawer',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './mobile-drawer.component.html',
  styleUrl: './mobile-drawer.component.scss',
})
export class MobileDrawerComponent {
  @Input() navTree: NavCategory[] = [];
  @Input() cartCount = 0;
  @Input() isLoggedIn = false;
  @Output() closed = new EventEmitter<void>();
  @Output() signedOut = new EventEmitter<void>();
  @Output() openModal = new EventEmitter<void>();

  readonly expandedSections = signal<Set<string>>(new Set());
  readonly collapsedDrawerGroups = signal<Set<string>>(new Set());

  toggleSection(slug: string): void {
    this.expandedSections.update(set => {
      const next = new Set(set);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  isSectionCollapsed(slug: string): boolean {
    return !this.expandedSections().has(slug);
  }

  toggleDrawerGroup(key: string): void {
    this.collapsedDrawerGroups.update(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  isDrawerGroupCollapsed(key: string): boolean {
    return this.collapsedDrawerGroups().has(key);
  }

  buildGroups(root: NavCategory): MegaGroup[] {
    const namedGroups: MegaGroup[] = [];
    const flat: NavCategory[] = [];

    for (const child of root.children ?? []) {
      if (child.children?.length) {
        namedGroups.push({ label: child.name, slug: child.slug, links: child.children, showBorder: true });
      } else {
        flat.push(child);
      }
    }

    const hasSubGroups = namedGroups.length > 0;
    const groups: MegaGroup[] = [...namedGroups];

    const chunkSize = 7;
    for (let i = 0; i < flat.length; i += chunkSize) {
      groups.push({
        label: i === 0 && !hasSubGroups ? root.name : '',
        slug: root.slug,
        links: flat.slice(i, i + chunkSize),
        showBorder: !hasSubGroups,
      });
    }

    return groups;
  }
}
