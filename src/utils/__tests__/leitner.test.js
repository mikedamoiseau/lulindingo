import { describe, it, expect } from 'vitest';
import {
  BOX_INTERVALS_DAYS,
  MAX_BOX,
  nextBox,
  nextDueDate,
  addDays,
} from '../leitner';

describe('BOX_INTERVALS_DAYS', () => {
  it('has 6 entries (boxes 0–5)', () => {
    expect(BOX_INTERVALS_DAYS).toHaveLength(6);
    expect(BOX_INTERVALS_DAYS).toEqual([1, 1, 2, 4, 7, 14]);
  });

  it('MAX_BOX is 5', () => {
    expect(MAX_BOX).toBe(5);
  });
});

describe('nextBox', () => {
  it('increments by 1 on correct, capped at 5', () => {
    expect(nextBox(0, true)).toBe(1);
    expect(nextBox(3, true)).toBe(4);
    expect(nextBox(5, true)).toBe(5);
  });

  it('decrements by 2 on wrong, floored at 0', () => {
    expect(nextBox(5, false)).toBe(3);
    expect(nextBox(2, false)).toBe(0);
    expect(nextBox(1, false)).toBe(0);
    expect(nextBox(0, false)).toBe(0);
  });
});

describe('addDays', () => {
  it('adds days within a month', () => {
    expect(addDays('2026-06-22', 1)).toBe('2026-06-23');
    expect(addDays('2026-06-22', 7)).toBe('2026-06-29');
  });

  it('crosses month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('crosses year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('nextDueDate', () => {
  it('wrong → today + 1 regardless of box', () => {
    expect(nextDueDate(5, false, '2026-06-22')).toBe('2026-06-23');
    expect(nextDueDate(0, false, '2026-06-22')).toBe('2026-06-23');
  });

  it('correct at box 0 → +1 day', () => {
    expect(nextDueDate(0, true, '2026-06-22')).toBe('2026-06-23');
  });

  it('correct at box 3 → +4 days', () => {
    expect(nextDueDate(3, true, '2026-06-22')).toBe('2026-06-26');
  });

  it('correct at box 5 → +14 days', () => {
    expect(nextDueDate(5, true, '2026-06-22')).toBe('2026-07-06');
  });
});
