import { describe, it, expect } from 'vitest';
import { calculateXp, getLessonBonus } from '../xpCalculator.js';

describe('xpCalculator', () => {
  it('calculateXp returns base XP of 10', () => {
    expect(calculateXp()).toBe(10);
  });

  it('getLessonBonus returns 50', () => {
    expect(getLessonBonus()).toBe(50);
  });
});
