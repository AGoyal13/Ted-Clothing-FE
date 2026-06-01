import { Component } from '@angular/core';
import { ThemeSwitcherComponent } from '../../../../shared/theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-preferences-tab',
  standalone: true,
  imports: [ThemeSwitcherComponent],
  templateUrl: './preferences-tab.component.html',
  styleUrl: './preferences-tab.component.scss',
})
export class PreferencesTabComponent {}
