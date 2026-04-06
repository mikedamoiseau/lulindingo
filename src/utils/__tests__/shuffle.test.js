import { describe, it, expect } from 'vitest';
import { shuffleArray } from '../shuffle';

describe('shuffleArray', () => {
  it('returns an array with the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(5);
  });

  it('contains all original elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it('returns empty array for empty input', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('returns single-element array unchanged', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('produces different orders over multiple runs', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      results.add(JSON.stringify(shuffleArray(input)));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
