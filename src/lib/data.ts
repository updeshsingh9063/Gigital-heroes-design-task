export const products = [
  { id: 'labels-stickers', name: 'Labels & Stickers', desc: 'Custom die-cut labels, product stickers, and branded decals in any shape or size.', color: '#C45D3E', tag: 'Most Popular', icon: '🏷️', base: 0.12, image: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=800&auto=format&fit=crop' },
  { id: 'race-numbers', name: 'Race & Event Numbers', desc: 'Durable bib numbers and event tags with variable data printing for races and competitions.', color: '#4A8C6F', tag: 'Variable Data', icon: '🏁', base: 1.50, image: 'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?q=80&w=800&auto=format&fit=crop' },
  { id: 'mtb-boards', name: 'MTB Boards', desc: 'Custom mountain bike frame boards and number plates, precision-cut and weather-resistant.', color: '#4A7A8C', tag: 'Precision Cut', icon: '🚵', base: 18.00, image: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?q=80&w=800&auto=format&fit=crop' },
  { id: 'stamps', name: 'Stamps', desc: 'Professional rubber and self-inking stamps for business, craft, and official use.', color: '#D4A03C', tag: 'Quick Turnaround', icon: '📮', base: 12.00, image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop' },
  { id: 'trophies', name: 'Trophies', desc: 'Laser-engraved trophies, plaques, and awards in acrylic, wood, and metal.', color: '#8C5A4A', tag: 'Premium', icon: '🏆', base: 25.00, image: 'https://images.unsplash.com/photo-1569728723358-d1a317aa7fba?q=80&w=800&auto=format&fit=crop' },
  { id: 'laser-cut', name: 'Laser-Cut Work', desc: 'Bespoke laser-cut items from acrylic, wood, and metal — signage, gifts, and components.', color: '#6B5B8C', tag: 'Custom', icon: '✂️', base: 15.00, image: 'https://images.unsplash.com/photo-1502014822147-1aedfb0676e0?q=80&w=800&auto=format&fit=crop' }
];

export const sizeMap: Record<string, string[]> = {
  'labels-stickers': ['50×50mm', '100×50mm', '100×100mm', 'A6', 'A5', 'A4'],
  'race-numbers': ['A5', 'A4', 'A3', 'Custom'],
  'mtb-boards': ['Small', 'Medium', 'Large', 'Custom'],
  'stamps': ['Small (25×15mm)', 'Medium (40×25mm)', 'Large (60×40mm)', 'XL (85×55mm)'],
  'trophies': ['Small Plaque', 'Medium Plaque', 'Large Plaque', 'Custom Trophy'],
  'laser-cut': ['200×200mm', '300×300mm', '500×300mm', '600×400mm', 'Custom']
};

export const matMap: Record<string, string[]> = {
  'labels-stickers': ['White Vinyl', 'Clear Vinyl', 'Kraft Paper', 'Holographic', 'Mirror Gold'],
  'race-numbers': ['Tyvek', 'Synthetic Paper', 'Vinyl'],
  'mtb-boards': ['Aluminium 3mm', 'Aluminium 5mm', 'Carbon Composite'],
  'stamps': ['Red Rubber', 'Self-Inking', 'Pre-Inked'],
  'trophies': ['Acrylic', 'Oak Wood', 'Walnut Wood', 'Brushed Aluminium'],
  'laser-cut': ['3mm Acrylic', '5mm Acrylic', '3mm Birch Ply', '5mm MDF', '3mm Aluminium']
};
