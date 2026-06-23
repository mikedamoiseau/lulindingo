import { useState } from 'react';
import {
  CATEGORIES,
  getItemsByCategory,
} from '../../data/den/catalog';
import { acornBalance, canAfford } from '../../utils/denEconomy';
import { renderDecor } from './denRenderers';
import styles from './DenShop.module.css';

const CATEGORY_LABELS = {
  sky: 'Sky',
  weather: 'Weather',
  pond: 'Pond',
  burrow: 'Burrow',
  plants: 'Plants',
  hat: 'Hats',
  bodyColor: 'Colors',
};

const COSMETIC_CATEGORIES = ['hat', 'bodyColor'];

// What slot bucket an item lives in, so we can tell if it is currently equipped.
function equippedIdFor(category, layout) {
  if (COSMETIC_CATEGORIES.includes(category)) return layout?.cosmetics?.[category] ?? null;
  return layout?.slots?.[category] ?? null;
}

// Mini SVG preview of an item for its shop card. bodyColor items have no
// render.kind, so we paint a solid swatch from their palette instead.
function ItemPreview({ item }) {
  if (item.category === 'bodyColor') {
    return (
      <svg className={styles.preview} viewBox="0 0 80 90" aria-hidden="true">
        <circle cx="40" cy="45" r="26" fill={item.render.body} />
        <circle cx="40" cy="52" r="15" fill={item.render.belly} />
      </svg>
    );
  }
  return (
    <svg className={styles.preview} viewBox="0 0 80 90" aria-hidden="true">
      {renderDecor(item)}
    </svg>
  );
}

/**
 * DenShop — category tabs + a grid of item cards, with a balance header.
 *
 * Stateless beyond the active tab: the parent owns the economy and passes
 * `totalXp` / `spentAcorns` / `layout` plus `onBuy` / `onEquip` / `onClear`
 * handlers. A card decides its action from ownership + affordability:
 *  - equipped         → shown as "Equipped", disabled (no-op).
 *  - owned, not equipped → onEquip(id).
 *  - unowned, affordable → onBuy(id) (buys + equips).
 *  - unowned, too dear   → disabled with a lock + cost.
 */
export default function DenShop({ totalXp, spentAcorns, layout, onBuy, onEquip, onClear }) {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const balance = acornBalance(totalXp, spentAcorns);
  const items = getItemsByCategory(activeCat);
  const equippedId = equippedIdFor(activeCat, layout);

  const cardFor = (item) => {
    const owned = layout?.owned?.includes(item.id);
    const equipped = equippedId === item.id;
    const affordable = canAfford(item.id, totalXp, spentAcorns, layout);

    let status;
    let onClick;
    let disabled = false;
    if (equipped) {
      status = 'Equipped';
      disabled = true;
    } else if (owned) {
      status = 'Owned';
      onClick = () => onEquip(item.id);
    } else if (affordable) {
      status = `${item.cost} 🌰`;
      onClick = () => onBuy(item.id);
    } else {
      status = `🔒 ${item.cost} 🌰`;
      disabled = true;
    }

    return (
      <button
        key={item.id}
        type="button"
        className={`${styles.card} ${equipped ? styles.equipped : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={item.name}
      >
        <ItemPreview item={item} />
        <span className={styles.name}>{item.name}</span>
        <span className={styles.status}>{status}</span>
      </button>
    );
  };

  return (
    <div className={styles.shop}>
      <div className={styles.balanceBar}>
        <span className={styles.balanceLabel}>Acorns to spend</span>
        <span className={styles.balance} data-testid="acorn-balance">
          {balance} 🌰
        </span>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Decor categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={cat === activeCat}
            className={`${styles.tab} ${cat === activeCat ? styles.tabActive : ''}`}
            onClick={() => setActiveCat(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {items.map(cardFor)}
        {equippedId && !COSMETIC_CATEGORIES.includes(activeCat) && (
          <button
            type="button"
            className={`${styles.card} ${styles.clearCard}`}
            onClick={() => onClear(activeCat)}
            aria-label={`Clear ${CATEGORY_LABELS[activeCat]}`}
          >
            <span className={styles.clearIcon}>✕</span>
            <span className={styles.name}>None</span>
            <span className={styles.status}>Remove</span>
          </button>
        )}
      </div>
    </div>
  );
}
