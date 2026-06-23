// Pure economy for Dingo's Den. Components stay thin — all balance / affordability
// / purchase / placement rules live here and are unit-tested in isolation,
// mirroring the progression.js / placementScoring.js convention.
//
// Currency model (KEY DESIGN DECISION #1/#2): acorns are NOT a stored balance and
// XP is never decremented. We persist a monotonic `spentAcorns` counter and the
// layout; the spendable balance is always RECOMPUTED as `totalXp - spentAcorns`.
// This keeps totalXp (and every level/progression signal derived from it) 100%
// intact while still giving the kid something to spend.
import catalog, {
  CATALOG_VERSION,
  FREE_STARTER_IDS,
  getCatalogItem,
} from '../data/den/catalog';

const DECOR_SLOTS = ['sky', 'weather', 'pond', 'burrow', 'plants'];
const COSMETIC_SLOTS = ['hat', 'bodyColor'];

/** Spendable acorns = earned XP minus everything spent. Never negative. */
export function acornBalance(totalXp, spentAcorns) {
  return Math.max(0, (totalXp || 0) - (spentAcorns || 0));
}

/** Whether an item id is a cosmetic (routes into cosmetics{}, not slots{}). */
function isCosmetic(item) {
  return COSMETIC_SLOTS.includes(item.slot);
}

/** Default layout for a brand-new den: free starters owned + equipped. */
export function createDefaultLayout() {
  const layout = {
    version: CATALOG_VERSION,
    owned: [...FREE_STARTER_IDS],
    slots: { sky: null, weather: null, pond: null, burrow: null, plants: null },
    cosmetics: { hat: null, bodyColor: null },
  };
  // Equip every free starter into its slot/cosmetic bucket.
  for (const id of FREE_STARTER_IDS) {
    const item = getCatalogItem(id);
    if (!item) continue;
    if (isCosmetic(item)) layout.cosmetics[item.slot] = id;
    else layout.slots[item.slot] = id;
  }
  return layout;
}

/** True if item exists, isn't already owned, and balance covers its cost. */
export function canAfford(itemId, totalXp, spentAcorns, layout) {
  const item = getCatalogItem(itemId);
  if (!item) return false;
  if (layout?.owned?.includes(itemId)) return false; // already owned → not a purchase
  return acornBalance(totalXp, spentAcorns) >= item.cost;
}

/** Deep-ish clone of a layout so reducers stay pure (never mutate inputs). */
function cloneLayout(layout) {
  return {
    version: layout.version,
    owned: [...layout.owned],
    slots: { ...layout.slots },
    cosmetics: { ...layout.cosmetics },
  };
}

/** Write an owned item id into its correct bucket (decor slot vs cosmetic). */
function equipInto(layout, item) {
  if (isCosmetic(item)) layout.cosmetics[item.slot] = item.id;
  else layout.slots[item.slot] = item.id;
}

/**
 * Buy (if needed) then equip an item.
 * Returns { ok, reason?, spentAcorns, layout }.
 *  - Owned item            → equips for free, spentAcorns unchanged.
 *  - Unowned + affordable   → adds to owned, increments spentAcorns by cost, equips.
 *  - Unowned + can't afford  → { ok:false, reason:'insufficient' }, NO mutation.
 *  - Unknown id             → { ok:false, reason:'unknown' }, NO mutation.
 * Pure: returns NEW objects, never mutates inputs. spentAcorns can only go UP.
 */
export function purchaseItem(itemId, totalXp, spentAcorns, layout) {
  const item = getCatalogItem(itemId);
  if (!item) {
    return { ok: false, reason: 'unknown', spentAcorns, layout };
  }

  const next = cloneLayout(layout);

  // Already owned: re-equip for free, no charge.
  if (next.owned.includes(itemId)) {
    equipInto(next, item);
    return { ok: true, spentAcorns, layout: next };
  }

  // Unowned: must be affordable. Guard so balance can never go negative.
  if (acornBalance(totalXp, spentAcorns) < item.cost) {
    return { ok: false, reason: 'insufficient', spentAcorns, layout };
  }

  next.owned.push(itemId);
  equipInto(next, item);
  return { ok: true, spentAcorns: spentAcorns + item.cost, layout: next };
}

/**
 * Equip an already-owned item into its slot/cosmetic.
 * Returns { ok, reason?, layout }. Refuses unknown or unowned items.
 */
export function equipItem(itemId, layout) {
  const item = getCatalogItem(itemId);
  if (!item) return { ok: false, reason: 'unknown', layout };
  if (!layout?.owned?.includes(itemId)) {
    return { ok: false, reason: 'not-owned', layout };
  }
  const next = cloneLayout(layout);
  equipInto(next, item);
  return { ok: true, layout: next };
}

/** Clear a slot or cosmetic (free). Returns a NEW layout; never mutates input. */
export function clearSlot(slot, layout) {
  const next = cloneLayout(layout);
  if (DECOR_SLOTS.includes(slot)) next.slots[slot] = null;
  else if (COSMETIC_SLOTS.includes(slot)) next.cosmetics[slot] = null;
  return next;
}

const KNOWN_IDS = new Set(catalog.map((i) => i.id));

/**
 * Reconcile a saved layout against the current catalog: drop unknown owned ids,
 * clear equipped slots/cosmetics pointing at dropped ids, re-add free starters
 * to `owned`, and stamp the current CATALOG_VERSION. Never throws on a missing /
 * malformed layout — returns a fresh default instead.
 */
export function migrateLayout(layout) {
  if (!layout || typeof layout !== 'object') return createDefaultLayout();

  const base = createDefaultLayout();

  // Owned: keep known ids, then ensure all free starters are present.
  const ownedIn = Array.isArray(layout.owned) ? layout.owned : [];
  const owned = new Set(ownedIn.filter((id) => KNOWN_IDS.has(id)));
  for (const id of FREE_STARTER_IDS) owned.add(id);

  const slots = { ...base.slots };
  const slotsIn = layout.slots || {};
  for (const slot of DECOR_SLOTS) {
    const id = slotsIn[slot];
    // Keep an equipped id only if it's known AND owned.
    slots[slot] = id && KNOWN_IDS.has(id) && owned.has(id) ? id : null;
  }

  const cosmetics = { ...base.cosmetics };
  const cosIn = layout.cosmetics || {};
  for (const slot of COSMETIC_SLOTS) {
    const id = cosIn[slot];
    cosmetics[slot] = id && KNOWN_IDS.has(id) && owned.has(id) ? id : null;
  }

  return {
    version: CATALOG_VERSION,
    owned: [...owned],
    slots,
    cosmetics,
  };
}
