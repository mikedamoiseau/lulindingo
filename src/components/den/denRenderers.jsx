// Generated decor SVG. Each catalog item's `render` is data (shape kind +
// palette + variant); this module maps a kind → a React SVG element built from
// numeric params, the same convention Mascot.jsx uses (shapes from data, no
// hand-authored path-art files). Everything targets the shared 0 0 80 90
// viewBox so a decor layer aligns with the Mascot in DenScene.

function sky([back, front] = [], variant) {
  // Full-bleed background rectangle, optional stars.
  return (
    <g>
      <rect x="0" y="0" width="80" height="90" fill={back || '#BFE9FF'} />
      <rect x="0" y="0" width="80" height="55" fill={front || back || '#EAF8FF'} opacity="0.55" />
      {variant === 'stars' && (
        <g fill="#FFFFFF">
          <circle cx="12" cy="12" r="1.2" />
          <circle cx="26" cy="8" r="0.9" />
          <circle cx="40" cy="16" r="1.4" />
          <circle cx="58" cy="9" r="1" />
          <circle cx="70" cy="18" r="1.2" />
          <circle cx="18" cy="26" r="0.8" />
          <circle cx="64" cy="30" r="1" />
        </g>
      )}
    </g>
  );
}

function cloud([fill] = []) {
  const c = fill || '#FFFFFF';
  return (
    <g fill={c}>
      <ellipse cx="20" cy="18" rx="10" ry="6" />
      <ellipse cx="28" cy="15" rx="8" ry="6" />
      <ellipse cx="13" cy="20" rx="7" ry="5" />
    </g>
  );
}

function sun([fill] = []) {
  const c = fill || '#FFD23F';
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = 62 + Math.cos(a) * 8;
    const y1 = 16 + Math.sin(a) * 8;
    const x2 = 62 + Math.cos(a) * 13;
    const y2 = 16 + Math.sin(a) * 13;
    rays.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2" strokeLinecap="round" />);
  }
  return (
    <g>
      {rays}
      <circle cx="62" cy="16" r="7" fill={c} />
    </g>
  );
}

function burrow([fill, dark] = []) {
  const f = fill || '#8A5A2B';
  const d = dark || '#5E3A18';
  return (
    <g>
      {/* mound */}
      <ellipse cx="40" cy="78" rx="34" ry="16" fill={f} />
      {/* opening */}
      <ellipse cx="40" cy="80" rx="13" ry="11" fill={d} />
    </g>
  );
}

function ellipse([fill] = []) {
  // pond
  const c = fill || '#5EC6E6';
  return (
    <g>
      <ellipse cx="40" cy="82" rx="26" ry="8" fill={c} />
      <ellipse cx="33" cy="80" rx="6" ry="1.6" fill="#FFFFFF" opacity="0.5" />
    </g>
  );
}

function plant([leaf, flower] = [], variant) {
  const g = leaf || '#5BA83E';
  const blades = (cx) => (
    <g key={cx} stroke={g} strokeWidth="2.5" strokeLinecap="round" fill="none">
      <path d={`M ${cx} 88 Q ${cx - 3} 80 ${cx - 5} 76`} />
      <path d={`M ${cx} 88 Q ${cx} 79 ${cx} 74`} />
      <path d={`M ${cx} 88 Q ${cx + 3} 80 ${cx + 5} 76`} />
    </g>
  );
  const positions = [10, 24, 56, 70];
  return (
    <g>
      {positions.map((p) => blades(p))}
      {variant === 'flowers' && flower && (
        <g fill={flower}>
          <circle cx="10" cy="74" r="2.4" />
          <circle cx="56" cy="73" r="2.4" />
          <circle cx="70" cy="75" r="2.4" />
        </g>
      )}
    </g>
  );
}

function hatCone([fill] = []) {
  const c = fill || '#FF6FA3';
  // Sits above the head (head center ~ cx40 cy35 r22 → top ~13).
  return (
    <g>
      <path d="M 40 -4 L 50 16 L 30 16 Z" fill={c} />
      <circle cx="40" cy="-4" r="2.5" fill="#FFFFFF" />
    </g>
  );
}

function hatCrown([fill] = []) {
  const c = fill || '#FFD23F';
  return (
    <g>
      <path d="M 28 16 L 28 4 L 34 10 L 40 2 L 46 10 L 52 4 L 52 16 Z" fill={c} stroke="#C9A21F" strokeWidth="0.8" />
      <circle cx="34" cy="6" r="1.2" fill="#FF6FA3" />
      <circle cx="40" cy="4" r="1.2" fill="#5EC6E6" />
      <circle cx="46" cy="6" r="1.2" fill="#FF6FA3" />
    </g>
  );
}

const RENDERERS = {
  sky,
  cloud,
  sun,
  burrow,
  ellipse,
  plant,
  'hat-cone': hatCone,
  'hat-crown': hatCrown,
};

/**
 * Render a catalog item's decor/cosmetic as an SVG element.
 * Returns null for a null item, a shapeless item, or an unknown kind (defensive
 * — a bad/removed catalog entry yields nothing rather than throwing).
 * bodyColor items (no render.kind) are NOT rendered here — they feed Mascot's prop.
 */
export function renderDecor(item) {
  const kind = item?.render?.kind;
  if (!kind) return null;
  const fn = RENDERERS[kind];
  if (!fn) return null;
  return fn(item.render.palette, item.render.variant);
}
