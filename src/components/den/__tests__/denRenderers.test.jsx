import { describe, it, expect } from 'vitest';
import { isValidElement } from 'react';
import { renderDecor } from '../denRenderers';
import catalog from '../../../data/den/catalog';

describe('renderDecor', () => {
  it('returns a valid React element for every decor/cosmetic kind in the catalog', () => {
    // bodyColor items have no render.kind — they feed Mascot's prop, not renderDecor.
    const renderable = catalog.filter((i) => i.render && i.render.kind);
    expect(renderable.length).toBeGreaterThan(0);
    for (const item of renderable) {
      const el = renderDecor(item);
      expect(isValidElement(el), `kind ${item.render.kind} should render an element`).toBe(true);
    }
  });

  it('covers every render.kind present in the catalog (no unhandled kind)', () => {
    const kinds = [...new Set(catalog.map((i) => i.render?.kind).filter(Boolean))];
    for (const kind of kinds) {
      const sample = catalog.find((i) => i.render?.kind === kind);
      expect(renderDecor(sample), `kind ${kind} must be handled`).not.toBeNull();
    }
  });

  it('returns null for an unknown kind (defensive)', () => {
    expect(renderDecor({ id: 'x', render: { kind: 'not-a-real-kind' } })).toBeNull();
  });

  it('returns null for a null / shapeless item', () => {
    expect(renderDecor(null)).toBeNull();
    expect(renderDecor({ id: 'x' })).toBeNull();
    expect(renderDecor({ id: 'x', render: {} })).toBeNull();
  });
});
