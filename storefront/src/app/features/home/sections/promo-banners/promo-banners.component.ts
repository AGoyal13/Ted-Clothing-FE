import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-promo-banners',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promo-banners.component.html',
  styleUrl: './promo-banners.component.scss',
})
export class PromoBannersComponent {}
