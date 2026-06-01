import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavCategory } from '../../../core/models/category.model';

interface MegaGroup { label: string; slug: string; links: NavCategory[]; showBorder: boolean; }

@Component({
  selector: 'navbar-mega',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './mega-menu.component.html',
  styleUrl: './mega-menu.component.scss',
})
export class MegaMenuComponent {
  @Input() root!: NavCategory;
  @Input() visible = false;
  @Output() enter = new EventEmitter<void>();
  @Output() leave = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

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
