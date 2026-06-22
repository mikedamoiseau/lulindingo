import Mascot from '../shared/Mascot';
import { getCatalogItem } from '../../data/den/catalog';
import { createDefaultLayout } from '../../utils/denEconomy';
import { renderDecor } from './denRenderers';
import styles from './DenScene.module.css';

// Decor layers in fixed z-order (back → front). The Mascot is composited between
// burrow and plants. Each layer is one <g data-layer> so the decor reads as an
// ordered stack with no compositing tricks — KEY DESIGN DECISION #9.
const BACK_LAYERS = ['sky', 'weather', 'pond', 'burrow'];
const FRONT_LAYERS = ['plants'];

/**
 * DenScene — composes the equipped decor as ordered SVG layers around the shared
 * Mascot. Reads everything synchronously from `layout` so the den rebuilds
 * instantly offline on first paint. `bodyColor`/`hat` cosmetics are passed into
 * Mascot as props (its defaults reproduce the classic render when unset).
 */
export default function DenScene({ layout }) {
  const l = layout || createDefaultLayout();

  const decorFor = (slot) => {
    const id = l.slots?.[slot];
    return id ? renderDecor(getCatalogItem(id)) : null;
  };

  const bodyColorItem = l.cosmetics?.bodyColor ? getCatalogItem(l.cosmetics.bodyColor) : null;
  const bodyColor = bodyColorItem ? bodyColorItem.render : undefined;

  const hatItem = l.cosmetics?.hat ? getCatalogItem(l.cosmetics.hat) : null;
  const hat = hatItem ? <g data-layer="hat">{renderDecor(hatItem)}</g> : null;

  return (
    <div className={styles.scene}>
      <svg
        className={styles.svg}
        viewBox="0 0 80 90"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Dingo's den"
      >
        {BACK_LAYERS.map((slot) => (
          <g key={slot} data-layer={slot}>
            {decorFor(slot)}
          </g>
        ))}

        {/* Mascot centerpiece — bodyColor + hat are cosmetic prop overrides. */}
        <g data-layer="mascot">
          <Mascot size="80" bodyColor={bodyColor} hat={hat} />
        </g>

        {FRONT_LAYERS.map((slot) => (
          <g key={slot} data-layer={slot}>
            {decorFor(slot)}
          </g>
        ))}
      </svg>
    </div>
  );
}
