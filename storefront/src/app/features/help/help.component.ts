import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
})
export class HelpComponent {
  readonly navOpen = signal(false);

  @HostListener('document:click')
  onDocClick(): void { this.navOpen.set(false); }
}
