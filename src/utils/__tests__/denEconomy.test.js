import { describe, it, expect } from 'vitest';
import {
  acornBalance,
  createDefaultLayout,
  canAfford,
  purchaseItem,
  equipItem,
  clearSlot,
  migrateLayout,
} from '../denEconomy';
import { CATALOG_VERSION, FREE_STARTER_IDS } from '../../data/den/catalog';

describe('acornBalance', () => {
  it('is earned XP minus spent', () => {
    expect(acornBalance(300, 110)).toBe(190);
  });
  it('never goes negative (clamps at 0)', () => {
    expect(acornBalance(50, 200)).toBe(0);
  });
  it('tolerates undefined inputs', () => {
    expect(acornBalance(undefined, undefined)).toBe(0);
    expect(acornBalance(100, undefined)).toBe(100);
  });
});

describe('createDefaultLayout', () => {
  it('owns and equips the free starters', () => {
    const l = createDefaultLayout();
    expect(l.version).toBe(CATALOG_VERSION);
    expect(l.owned).toEqual(expect.arrayContaining([...FREE_STARTER_IDS]));
    expect(l.slots.sky).toBe('sky-day');
    expect(l.cosmetics.bodyColor).toBe('color-classic');
  });
  it('leaves non-starter slots empty', () => {
    const l = createDefaultLayout();
    expect(l.slots.pond).toBeNull();
    expect(l.slots.weather).toBeNull();
    expect(l.slots.burrow).toBeNull();
    expect(l.slots.plants).toBeNull();
    expect(l.cosmetics.hat).toBeNull();
  });
  it('returns a fresh object each call (no shared mutable state)', () => {
    const a = createDefaultLayout();
    const b = createDefaultLayout();
    a.owned.push('mutated');
    expect(b.owned).not.toContain('mutated');
  });
});

describe('canAfford', () => {
  it('is false for an unknown item', () => {
    expect(canAfford('nope', 9999, 0, createDefaultLayout())).toBe(false);
  });
  it('is false for an already-owned item', () => {
    expect(canAfford('sky-day', 9999, 0, createDefaultLayout())).toBe(false);
  });
  it('is true when the balance covers the cost', () => {
    expect(canAfford('hat-party', 100, 0, createDefaultLayout())).toBe(true); // cost 100
  });
  it('is true when balance exactly equals cost', () => {
    expect(canAfford('hat-party', 100, 0, createDefaultLayout())).toBe(true);
  });
  it('is false when balance is one short', () => {
    expect(canAfford('hat-party', 99, 0, createDefaultLayout())).toBe(false);
  });
});

describe('purchaseItem', () => {
  it('buys + equips an affordable item and increments spent by cost', () => {
    const before = createDefaultLayout();
    const res = purchaseItem('hat-party', 300, 0, before); // cost 100
    expect(res.ok).toBe(true);
    expect(res.spentAcorns).toBe(100);
    expect(res.layout.owned).toContain('hat-party');
    expect(res.layout.cosmetics.hat).toBe('hat-party');
    // input untouched
    expect(before.owned).not.toContain('hat-party');
    expect(before.cosmetics.hat).toBeNull();
  });

  it('equips decor into slots, not cosmetics', () => {
    const res = purchaseItem('pond-small', 300, 0, createDefaultLayout()); // cost 70
    expect(res.ok).toBe(true);
    expect(res.layout.slots.pond).toBe('pond-small');
    expect(res.layout.cosmetics.hat).toBeNull();
  });

  it('rejects an unaffordable item without mutating', () => {
    const before = createDefaultLayout();
    const res = purchaseItem('hat-crown', 100, 0, before); // cost 200
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('insufficient');
    expect(res.spentAcorns).toBe(0);
    expect(res.layout).toEqual(before);
  });

  it('succeeds when balance exactly equals cost (balance drops to 0)', () => {
    const res = purchaseItem('hat-party', 100, 0, createDefaultLayout()); // cost 100
    expect(res.ok).toBe(true);
    expect(acornBalance(100, res.spentAcorns)).toBe(0);
  });

  it('rejects an unknown item', () => {
    const before = createDefaultLayout();
    const res = purchaseItem('nope', 9999, 0, before);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('unknown');
    expect(res.spentAcorns).toBe(0);
    expect(res.layout).toEqual(before);
  });

  it('re-buying an owned item costs nothing and just equips', () => {
    const first = purchaseItem('hat-party', 300, 0, createDefaultLayout());
    // clear it, then "buy" again — should re-equip for free
    const cleared = clearSlot('hat', first.layout);
    const res = purchaseItem('hat-party', 300, first.spentAcorns, cleared);
    expect(res.ok).toBe(true);
    expect(res.spentAcorns).toBe(first.spentAcorns); // unchanged
    expect(res.layout.cosmetics.hat).toBe('hat-party');
  });

  it('keeps spentAcorns monotonic across a sequence', () => {
    let layout = createDefaultLayout();
    let spent = 0;
    const totalXp = 1000;
    const seq = ['pond-small', 'pond-small', 'hat-party', 'weather-cloud', 'hat-crown'];
    let prev = spent;
    for (const id of seq) {
      const res = purchaseItem(id, totalXp, spent, layout);
      if (res.ok) {
        layout = res.layout;
        spent = res.spentAcorns;
      }
      expect(spent).toBeGreaterThanOrEqual(prev);
      prev = spent;
    }
  });
});

describe('equipItem / clearSlot', () => {
  it('equips an owned decor item into the right slot', () => {
    const bought = purchaseItem('pond-small', 300, 0, createDefaultLayout());
    const cleared = clearSlot('pond', bought.layout);
    expect(cleared.slots.pond).toBeNull();
    const res = equipItem('pond-small', cleared);
    expect(res.ok).toBe(true);
    expect(res.layout.slots.pond).toBe('pond-small');
  });

  it('equips an owned cosmetic into cosmetics, never slots', () => {
    const bought = purchaseItem('hat-party', 300, 0, createDefaultLayout());
    const res = equipItem('hat-party', bought.layout);
    expect(res.ok).toBe(true);
    expect(res.layout.cosmetics.hat).toBe('hat-party');
  });

  it('refuses to equip an unowned item', () => {
    const res = equipItem('hat-crown', createDefaultLayout());
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not-owned');
  });

  it('refuses to equip an unknown item', () => {
    const res = equipItem('nope', createDefaultLayout());
    expect(res.ok).toBe(false);
  });

  it('clearSlot empties a decor slot for free and does not mutate input', () => {
    const before = createDefaultLayout();
    const cleared = clearSlot('sky', before);
    expect(cleared.slots.sky).toBeNull();
    expect(before.slots.sky).toBe('sky-day'); // input untouched
  });

  it('clearSlot empties a cosmetic slot', () => {
    const cleared = clearSlot('bodyColor', createDefaultLayout());
    expect(cleared.cosmetics.bodyColor).toBeNull();
  });
});

describe('migrateLayout', () => {
  it('returns a default layout for undefined input', () => {
    expect(migrateLayout(undefined)).toEqual(createDefaultLayout());
  });

  it('drops unknown owned ids and unknown equipped ids', () => {
    const dirty = {
      version: 1,
      owned: ['sky-day', 'color-classic', 'ghost-item'],
      slots: { sky: 'sky-day', weather: 'ghost-item', pond: null, burrow: null, plants: null },
      cosmetics: { hat: null, bodyColor: 'color-classic' },
    };
    const migrated = migrateLayout(dirty);
    expect(migrated.owned).not.toContain('ghost-item');
    expect(migrated.slots.weather).toBeNull();
    expect(migrated.slots.sky).toBe('sky-day');
  });

  it('re-adds free starters to owned even if a saved layout lost them', () => {
    const dirty = {
      version: 1,
      owned: ['hat-party'],
      slots: { sky: null, weather: null, pond: null, burrow: null, plants: null },
      cosmetics: { hat: 'hat-party', bodyColor: null },
    };
    const migrated = migrateLayout(dirty);
    for (const id of FREE_STARTER_IDS) {
      expect(migrated.owned).toContain(id);
    }
  });

  it('stamps the current CATALOG_VERSION', () => {
    const migrated = migrateLayout({ version: 0, owned: [], slots: {}, cosmetics: {} });
    expect(migrated.version).toBe(CATALOG_VERSION);
  });

  it('keeps equipped items that are still valid and owned', () => {
    const bought = purchaseItem('pond-small', 300, 0, createDefaultLayout());
    const migrated = migrateLayout(bought.layout);
    expect(migrated.slots.pond).toBe('pond-small');
    expect(migrated.owned).toContain('pond-small');
  });
});
