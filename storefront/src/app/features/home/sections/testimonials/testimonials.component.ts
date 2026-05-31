import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';

interface Feedback {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
}

interface Testimonial {
  quote: string;
  author: string;
  initials: string;
  location: string;
  rating: number;
}

const FALLBACK: Testimonial[] = [
  {
    quote: 'The quality is unlike anything I\'ve found locally. The fabric breathes beautifully and the fit is impeccable. Ted Clothing is now my go-to for every occasion.',
    author: 'Arjun Mehta',
    initials: 'AM',
    location: 'Mumbai, India',
    rating: 5,
  },
  {
    quote: 'I ordered the linen kurta set and wore it to a family function. I received so many compliments. The attention to detail — the stitching, the buttons — everything is perfect.',
    author: 'Priya Nair',
    initials: 'PN',
    location: 'Bengaluru, India',
    rating: 5,
  },
  {
    quote: 'Finally, a brand that understands quiet luxury without the European price tag. I\'ve purchased three times now and each piece only gets better with wear.',
    author: 'Rohan Sharma',
    initials: 'RS',
    location: 'Delhi, India',
    rating: 5,
  },
];

function toInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss',
})
export class TestimonialsComponent {
  private api = inject(ApiService);

  private liveFeedback = toSignal(
    this.api.get<Feedback[]>('/feedback', { limit: 3 }).pipe(
      map(items => items.map(f => ({
        quote: f.quote,
        author: f.name,
        initials: toInitials(f.name),
        location: f.location,
        rating: f.rating,
      }))),
      catchError(() => of([] as Testimonial[])),
    ),
    { initialValue: null },
  );

  readonly testimonials = () => {
    const live = this.liveFeedback();
    return live !== null && live.length > 0 ? live : FALLBACK;
  };
}
