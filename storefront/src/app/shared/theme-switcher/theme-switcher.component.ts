import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { ThemeService, ThemeId } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  templateUrl: './theme-switcher.component.html',
  styleUrl: './theme-switcher.component.scss',
})
export class ThemeSwitcherComponent {
  readonly themeService = inject(ThemeService);
  readonly open = signal(false);
  readonly inline = input(false);
  private readonly elRef = inject(ElementRef);

  activeTheme() {
    return this.themeService.themes.find(t => t.id === this.themeService.activeId());
  }

  toggle(): void {
    this.open.update(v => !v);
  }

  select(id: ThemeId): void {
    this.themeService.setTheme(id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
