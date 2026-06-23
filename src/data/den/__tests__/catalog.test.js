import { describe, it, expect } from 'vitest';
import catalog, {
  CATALOG_VERSION,
  FREE_STARTER_IDS,
  getCatalogItem,
  getItemsByCategory,
  CATEGORIES,
} from '../catalog';

// Cosmetic categories route into denLayout.cosmetics; everything else into slots.
const COSMETIC_CATEGORIES = ['hat', 'bodyColor'];
const DECOR_SLOTS = ['sky', 'weather', 'pond', 'burrow', 'plants'];

describe('den catalog', () => {
  it('has a positive integer CATALOG_VERSION', () => {
    expect(Number.isInteger(CATALOG_VERSION)).toBe(true);
    expect(CATALOG_VERSION).toBeGreaterThan(0);
  });

  it('has unique item ids', () => {
    const ids = catalog.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every item a non-negative numeric cost', () => {
    for (const item of catalog) {
      expect(typeof item.cost).toBe('number');
      expect(item.cost).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses a known category for every item', () => {
    for (const item of catalog) {
      expect(CATEGORIES).toContain(item.category);
    }
  });

  it('routes decor items to a valid decor slot and cosmetics to their own slot', () => {
    for (const item of catalog) {
      if (COSMETIC_CATEGORIES.includes(item.category)) {
        // Cosmetics declare slot === category so equip routes into cosmetics[category].
        expect(item.slot).toBe(item.category);
      } else {
        expect(DECOR_SLOTS).toContain(item.slot);
        // Decor's slot matches its category (one item per slot per category).
        expect(item.slot).toBe(item.category);
      }
    }
  });

  it('gives every item a render descriptor', () => {
    for (const item of catalog) {
      expect(item.render).toBeTruthy();
      expect(typeof item.render).toBe('object');
    }
  });

  it('FREE_STARTER_IDS contains exactly the cost===0 items', () => {
    const expected = catalog.filter((i) => i.cost === 0).map((i) => i.id).sort();
    expect([...FREE_STARTER_IDS].sort()).toEqual(expected);
  });

  it('has at least one free starter for the sky and bodyColor slots', () => {
    const free = new Set(FREE_STARTER_IDS);
    const freeItems = catalog.filter((i) => free.has(i.id));
    expect(freeItems.some((i) => i.category === 'sky')).toBe(true);
    expect(freeItems.some((i) => i.category === 'bodyColor')).toBe(true);
  });

  it('getCatalogItem returns the item or null', () => {
    expect(getCatalogItem('sky-day')).toMatchObject({ id: 'sky-day' });
    expect(getCatalogItem('does-not-exist')).toBeNull();
  });

  it('getItemsByCategory filters by category', () => {
    for (const cat of CATEGORIES) {
      const items = getItemsByCategory(cat);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.category === cat)).toBe(true);
    }
  });
});
