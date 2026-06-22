import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import DenScene from '../DenScene';
import { createDefaultLayout, purchaseItem } from '../../../utils/denEconomy';

afterEach(cleanup);

describe('DenScene', () => {
  it('renders a single svg scene with exactly one Mascot', () => {
    const { container } = render(<DenScene layout={createDefaultLayout()} />);
    // The scene is one outer svg; Mascot is a nested svg.
    const mascots = container.querySelectorAll('svg svg');
    expect(mascots.length).toBe(1);
  });

  it('renders the sky and pond layers when both are equipped', () => {
    let { layout } = purchaseItem('pond-small', 500, 0, createDefaultLayout());
    const { container } = render(<DenScene layout={layout} />);
    // sky-day equipped by default → sky group present (light blue rect)
    expect(container.querySelector('[data-layer="sky"]')).toBeTruthy();
    expect(container.querySelector('[data-layer="pond"]')).toBeTruthy();
  });

  it('renders nothing for an empty slot', () => {
    const { container } = render(<DenScene layout={createDefaultLayout()} />);
    // weather/pond/burrow/plants empty by default
    expect(container.querySelector('[data-layer="pond"] *')).toBeNull();
    expect(container.querySelector('[data-layer="weather"] *')).toBeNull();
  });

  it('passes the bodyColor cosmetic through to the Mascot fills', () => {
    let { layout } = purchaseItem('color-blue', 500, 0, createDefaultLayout());
    const { container } = render(<DenScene layout={layout} />);
    // color-blue body is #5B8DEF
    expect(container.querySelectorAll('[fill="#5B8DEF"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[fill="#E8943A"]').length).toBe(0);
  });

  it('renders the equipped hat inside the Mascot layer', () => {
    let { layout } = purchaseItem('hat-party', 500, 0, createDefaultLayout());
    const { container } = render(<DenScene layout={layout} />);
    expect(container.querySelector('[data-layer="hat"]')).toBeTruthy();
  });

  it('tolerates an undefined layout (renders a default scene)', () => {
    const { container } = render(<DenScene layout={undefined} />);
    expect(container.querySelectorAll('svg svg').length).toBe(1);
  });
});
