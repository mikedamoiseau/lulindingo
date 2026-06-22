// Static decor + cosmetic catalog for Dingo's Den.
//
// Mirrors the static-catalog convention used elsewhere (units.js): a flat array
// of plain-data items plus a few read helpers. The catalog is data-only — every
// item's `render` field is parameters (shape kind + palette + variant), never
// hand-authored path art. `denRenderers.js` turns those params into SVG.
//
// CATALOG_VERSION is stamped into a saved denLayout so a later catalog change
// can migrate older layouts (drop removed ids, re-add free starters).
export const CATALOG_VERSION = 1;

// cost 0 = free starter (auto-owned + auto-equipped in a fresh den).
// `slot` always equals `category` here: decor categories map to denLayout.slots,
// cosmetic categories (hat, bodyColor) map to denLayout.cosmetics.
const catalog = [
  // --- sky (background, one equipped) ---
  { id: 'sky-day', category: 'sky', slot: 'sky', name: 'Sunny Day', cost: 0,
    render: { kind: 'sky', palette: ['#BFE9FF', '#EAF8FF'] } },
  { id: 'sky-sunset', category: 'sky', slot: 'sky', name: 'Sunset', cost: 60,
    render: { kind: 'sky', palette: ['#FFD2A6', '#FFE9CC'] } },
  { id: 'sky-night', category: 'sky', slot: 'sky', name: 'Starry Night', cost: 120,
    render: { kind: 'sky', palette: ['#1B2A4A', '#33406B'], variant: 'stars' } },

  // --- weather ---
  { id: 'weather-cloud', category: 'weather', slot: 'weather', name: 'Fluffy Cloud', cost: 40,
    render: { kind: 'cloud', palette: ['#FFFFFF'] } },
  { id: 'weather-sun', category: 'weather', slot: 'weather', name: 'Bright Sun', cost: 80,
    render: { kind: 'sun', palette: ['#FFD23F'] } },

  // --- burrow ---
  { id: 'burrow-basic', category: 'burrow', slot: 'burrow', name: 'Cozy Burrow', cost: 50,
    render: { kind: 'burrow', palette: ['#8A5A2B', '#5E3A18'] } },

  // --- pond ---
  { id: 'pond-small', category: 'pond', slot: 'pond', name: 'Little Pond', cost: 70,
    render: { kind: 'ellipse', palette: ['#5EC6E6'] } },

  // --- plants (foreground) ---
  { id: 'plants-grass', category: 'plants', slot: 'plants', name: 'Grass Tufts', cost: 30,
    render: { kind: 'plant', palette: ['#5BA83E'], variant: 'grass' } },
  { id: 'plants-flowers', category: 'plants', slot: 'plants', name: 'Wildflowers', cost: 90,
    render: { kind: 'plant', palette: ['#5BA83E', '#FF6FA3'], variant: 'flowers' } },

  // --- cosmetics: hat ---
  { id: 'hat-party', category: 'hat', slot: 'hat', name: 'Party Hat', cost: 100,
    render: { kind: 'hat-cone', palette: ['#FF6FA3'] } },
  { id: 'hat-crown', category: 'hat', slot: 'hat', name: 'Golden Crown', cost: 200,
    render: { kind: 'hat-crown', palette: ['#FFD23F'] } },

  // --- cosmetics: bodyColor (passed as a prop override into Mascot) ---
  { id: 'color-classic', category: 'bodyColor', slot: 'bodyColor', name: 'Classic Orange', cost: 0,
    render: { body: '#E8943A', belly: '#F5C882', dark: '#D4762A' } },
  { id: 'color-blue', category: 'bodyColor', slot: 'bodyColor', name: 'Sky Blue', cost: 110,
    render: { body: '#5B8DEF', belly: '#BCD8FF', dark: '#3F6FCF' } },
];

export default catalog;

export const FREE_STARTER_IDS = catalog.filter((i) => i.cost === 0).map((i) => i.id);
export const getCatalogItem = (id) => catalog.find((i) => i.id === id) || null;
export const getItemsByCategory = (cat) => catalog.filter((i) => i.category === cat);
export const CATEGORIES = ['sky', 'weather', 'pond', 'burrow', 'plants', 'hat', 'bodyColor'];
