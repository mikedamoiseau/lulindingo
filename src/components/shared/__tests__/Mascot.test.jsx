import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Mascot from '../Mascot';

afterEach(cleanup);

describe('Mascot', () => {
  it('renders the default orange body fill when no props are given (regression)', () => {
    const { container } = render(<Mascot />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // Body + head use the classic orange. At least one fill of #E8943A must exist.
    const orange = container.querySelectorAll('[fill="#E8943A"]');
    expect(orange.length).toBeGreaterThan(0);
    // Belly + snout use the classic cream.
    expect(container.querySelectorAll('[fill="#F5C882"]').length).toBeGreaterThan(0);
    // Ear inner uses the classic dark orange.
    expect(container.querySelectorAll('[fill="#D4762A"]').length).toBeGreaterThan(0);
  });

  it('keeps the shared 0 0 80 90 viewBox', () => {
    const { container } = render(<Mascot />);
    expect(container.querySelector('svg').getAttribute('viewBox')).toBe('0 0 80 90');
  });

  it('swaps body fills when bodyColor is provided', () => {
    const { container } = render(
      <Mascot bodyColor={{ body: '#5B8DEF', belly: '#BCD8FF', dark: '#3F6FCF' }} />
    );
    expect(container.querySelectorAll('[fill="#5B8DEF"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[fill="#BCD8FF"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[fill="#3F6FCF"]').length).toBeGreaterThan(0);
    // The classic orange must be gone when overridden.
    expect(container.querySelectorAll('[fill="#E8943A"]').length).toBe(0);
  });

  it('falls back to defaults for a partial bodyColor override', () => {
    const { container } = render(<Mascot bodyColor={{ body: '#111111' }} />);
    expect(container.querySelectorAll('[fill="#111111"]').length).toBeGreaterThan(0);
    // belly/dark fall back to the classic palette
    expect(container.querySelectorAll('[fill="#F5C882"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[fill="#D4762A"]').length).toBeGreaterThan(0);
  });

  it('renders a hat node when hat prop is given', () => {
    const { getByTestId } = render(
      <Mascot hat={<g data-testid="hat-group" />} />
    );
    expect(getByTestId('hat-group')).toBeTruthy();
  });

  it('renders no hat group by default', () => {
    const { queryByTestId } = render(<Mascot />);
    expect(queryByTestId('hat-group')).toBeNull();
  });
});
