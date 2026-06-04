import { SizeGuide } from '../../../core/models/product.model';

export type SizeGuideGroup = 'tops' | 'bottoms' | 'footwear' | 'kids';

const TOPS: SizeGuide = {
  id: '_fallback_tops',
  name: 'Tops & Shirts',
  measurements: [
    { key: 'chest', label: 'Chest', howTo: 'Measure around the fullest part of your chest, keep tape level.' },
    { key: 'waist', label: 'Waist', howTo: 'Measure around your natural waist (narrowest part).' },
    { key: 'length', label: 'Length', howTo: 'Measure from the highest point of the shoulder to the hem.' },
  ],
  rows: [
    { size: 'XS', values: { chest: '34–35', waist: '28–29', length: '26' } },
    { size: 'S',  values: { chest: '36–37', waist: '30–31', length: '27' } },
    { size: 'M',  values: { chest: '38–39', waist: '32–33', length: '27.5' } },
    { size: 'L',  values: { chest: '40–41', waist: '34–35', length: '28' } },
    { size: 'XL', values: { chest: '42–43', waist: '36–37', length: '28.5' } },
    { size: 'XXL', values: { chest: '44–45', waist: '38–39', length: '29' } },
  ],
  fitTip: 'For a relaxed fit, go one size up.',
};

const BOTTOMS: SizeGuide = {
  id: '_fallback_bottoms',
  name: 'Bottoms & Dresses',
  measurements: [
    { key: 'waist', label: 'Waist', howTo: 'Measure around the natural waist where you\'d wear the garment.' },
    { key: 'hips', label: 'Hips', howTo: 'Measure around the fullest part of your hips, ~8 inches below waist.' },
    { key: 'inseam', label: 'Inseam', howTo: 'Measure from crotch seam to ankle bone (inside of leg).' },
  ],
  rows: [
    { size: 'XS', values: { waist: '26–27', hips: '34–35', inseam: '30' } },
    { size: 'S',  values: { waist: '28–29', hips: '36–37', inseam: '30.5' } },
    { size: 'M',  values: { waist: '30–31', hips: '38–39', inseam: '31' } },
    { size: 'L',  values: { waist: '32–33', hips: '40–41', inseam: '31.5' } },
    { size: 'XL', values: { waist: '34–35', hips: '42–43', inseam: '32' } },
    { size: 'XXL', values: { waist: '36–37', hips: '44–45', inseam: '32' } },
  ],
  fitTip: null,
};

const FOOTWEAR: SizeGuide = {
  id: '_fallback_footwear',
  name: 'Footwear',
  measurements: [
    { key: 'foot', label: 'Foot length', howTo: 'Stand on a sheet of paper, trace outline of foot, measure heel-to-toe length in cm.' },
  ],
  rows: [
    { size: 'UK 5',  values: { foot: '24.0' } },
    { size: 'UK 6',  values: { foot: '24.6' } },
    { size: 'UK 7',  values: { foot: '25.4' } },
    { size: 'UK 8',  values: { foot: '26.2' } },
    { size: 'UK 9',  values: { foot: '26.7' } },
    { size: 'UK 10', values: { foot: '27.3' } },
    { size: 'UK 11', values: { foot: '27.9' } },
  ],
  fitTip: 'If between sizes, size up.',
};

const KIDS: SizeGuide = {
  id: '_fallback_kids',
  name: 'Kids',
  measurements: [
    { key: 'height', label: 'Height', howTo: 'Measure height from floor to top of head (cm).' },
    { key: 'chest', label: 'Chest', howTo: 'Measure around fullest part of chest (inches).' },
    { key: 'waist', label: 'Waist', howTo: 'Measure around natural waist (inches).' },
  ],
  rows: [
    { size: '2–3Y',  values: { height: '92–98',   chest: '21', waist: '20' } },
    { size: '3–4Y',  values: { height: '98–104',  chest: '22', waist: '21' } },
    { size: '4–5Y',  values: { height: '104–110', chest: '23', waist: '21.5' } },
    { size: '5–6Y',  values: { height: '110–116', chest: '24', waist: '22' } },
    { size: '7–8Y',  values: { height: '122–128', chest: '26', waist: '23' } },
    { size: '9–10Y', values: { height: '134–140', chest: '28', waist: '24' } },
  ],
  fitTip: null,
};

export const FALLBACK_GUIDES: Record<SizeGuideGroup, SizeGuide> = {
  tops: TOPS,
  bottoms: BOTTOMS,
  footwear: FOOTWEAR,
  kids: KIDS,
};

export function getSizeGuideGroup(slug: string): SizeGuideGroup | null {
  if (!slug) return null;
  if (/tshirt|polo|shirt|hoodie|jacket|coord.set/.test(slug)) return 'tops';
  if (/bottom|dress/.test(slug)) return 'bottoms';
  if (/footwear/.test(slug)) return 'footwear';
  if (slug.startsWith('kids-')) return 'kids';
  return null;
}
