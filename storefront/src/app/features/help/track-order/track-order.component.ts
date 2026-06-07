import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './track-order.component.html',
  styleUrl: './track-order.component.scss',
})
export class TrackOrderComponent {}
