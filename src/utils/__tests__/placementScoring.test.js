import { describe, it, expect } from 'vitest';
import { DIFFICULTY_LADDER, scorePlacement } from '../placementScoring';

// ─── DIFFICULTY_LADDER ───────────────────────────────────────────────────────

describe('DIFFICULTY_LADDER', () => {
  it('has exactly 8 levels', () => {
    expect(DIFFICULTY_LADDER).toHaveLength(8);
  });

  it('each entry has ageBand, operation, and tier', () => {
    DIFFICULTY_LADDER.forEach((entry) => {
      expect(entry).toHaveProperty('ageBand');
      expect(entry).toHaveProperty('operation');
      expect(entry).toHaveProperty('tier');
    });
  });

  it('levels are numbered 1–8 in order', () => {
    DIFFICULTY_LADDER.forEach((entry, i) => {
      expect(entry.level).toBe(i + 1);
    });
  });

  it('ageBands are only valid values', () => {
    const valid = new Set(['6-7', '8-10', '11-12']);
    DIFFICULTY_LADDER.forEach((entry) => {
      expect(valid.has(entry.ageBand)).toBe(true);
    });
  });

  it('operations are only valid values', () => {
    const valid = new Set(['addition', 'subtraction', 'multiplication', 'division']);
    DIFFICULTY_LADDER.forEach((entry) => {
      expect(valid.has(entry.operation)).toBe(true);
    });
  });
});

// ─── scorePlacement ──────────────────────────────────────────────────────────

// Build a simple all-wrong answers array (levels 1–8)
const allWrong = Array.from({ length: 8 }, (_, i) => ({ level: i + 1, correct: false }));

// All correct answers (levels 1–8)
const allCorrect = Array.from({ length: 8 }, (_, i) => ({ level: i + 1, correct: true }));

// Climbing from level 3 to 8 correct (typical advanced child)
const climbFrom3 = [
  { level: 1, correct: false },
  { level: 2, correct: false },
  { level: 3, correct: true },
  { level: 4, correct: true },
  { level: 5, correct: true },
  { level: 6, correct: true },
  { level: 7, correct: true },
  { level: 8, correct: true },
];

// Mixed answers — mostly correct in the middle
const mixedAnswers = [
  { level: 1, correct: true },
  { level: 2, correct: true },
  { level: 3, correct: true },
  { level: 4, correct: false },
  { level: 5, correct: false },
  { level: 6, correct: false },
  { level: 7, correct: false },
  { level: 8, correct: false },
];

// Late lucky: mostly wrong but one lucky correct at the end
const lateLucky = [
  { level: 1, correct: false },
  { level: 2, correct: false },
  { level: 3, correct: false },
  { level: 4, correct: false },
  { level: 5, correct: false },
  { level: 6, correct: false },
  { level: 7, correct: false },
  { level: 8, correct: true },  // lucky last answer
];

// Low total correct (only 2 correct — below the threshold of 3)
const lowTotalCorrect = [
  { level: 1, correct: true },
  { level: 2, correct: false },
  { level: 3, correct: false },
  { level: 4, correct: false },
  { level: 5, correct: false },
  { level: 6, correct: true },
  { level: 7, correct: false },
  { level: 8, correct: false },
];

describe('scorePlacement', () => {
  it('returns an object with ageBand and startingTier', () => {
    const result = scorePlacement(allWrong);
    expect(result).toHaveProperty('ageBand');
    expect(result).toHaveProperty('startingTier');
  });

  it('all wrong → starter placement (level 1 → ageBand 6-7, tier 1)', () => {
    const result = scorePlacement(allWrong);
    expect(result.ageBand).toBe('6-7');
    expect(result.startingTier).toBe(1);
  });

  it('climbing from level 3 to 8 correct → challenger tier >= 2', () => {
    const result = scorePlacement(climbFrom3);
    expect(result.startingTier).toBeGreaterThanOrEqual(2);
  });

  it('all correct → highest placement (level 8 → ageBand 11-12, tier 4)', () => {
    const result = scorePlacement(allCorrect);
    expect(result.ageBand).toBe('11-12');
    expect(result.startingTier).toBe(4);
  });

  it('mixed answers → middle placement (ageBand 6-7 or 8-10)', () => {
    const result = scorePlacement(mixedAnswers);
    const validBands = ['6-7', '8-10'];
    expect(validBands).toContain(result.ageBand);
  });

  it('late lucky answer does not over-promote (mostly wrong, one lucky at end)', () => {
    const result = scorePlacement(lateLucky);
    // Should NOT be placed at 11-12 / tier 4 just because last answer was level 8 correct
    expect(result.ageBand).not.toBe('11-12');
  });

  it('low total correct (< 3) caps placement downward', () => {
    const full = scorePlacement(allCorrect);
    const capped = scorePlacement(lowTotalCorrect);
    // Capped result must not reach the same height as all-correct
    expect(capped.startingTier).toBeLessThan(full.startingTier);
  });

  it('random inputs always produce a valid ageBand and startingTier (1–5)', () => {
    const validBands = new Set(['6-7', '8-10', '11-12']);
    for (let trial = 0; trial < 50; trial++) {
      const answers = Array.from({ length: 8 }, (_, i) => ({
        level: i + 1,
        correct: Math.random() < 0.5,
      }));
      const result = scorePlacement(answers);
      expect(validBands.has(result.ageBand)).toBe(true);
      expect(result.startingTier).toBeGreaterThanOrEqual(1);
      expect(result.startingTier).toBeLessThanOrEqual(5);
    }
  });
});
