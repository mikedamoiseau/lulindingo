import { describe, it, expect } from 'vitest';
import { getLocalDateString, calculateStreak, isStreakMilestone } from '../streakTracker.js';

function dateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
}

describe('getLocalDateString', () => {
  it('returns YYYY-MM-DD format using local time', () => {
    const result = getLocalDateString(new Date(2026, 0, 5)); // Jan 5, 2026 local
    expect(result).toBe('2026-01-05');
  });

  it('pads single-digit month and day', () => {
    const result = getLocalDateString(new Date(2026, 2, 3)); // Mar 3, 2026 local
    expect(result).toBe('2026-03-03');
  });

  it('defaults to today when no argument', () => {
    const result = getLocalDateString();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});

describe('calculateStreak', () => {
  it('returns current streak when lastActiveDate is today', () => {
    expect(calculateStreak(dateString(0), 5)).toBe(5);
  });

  it('returns current streak when lastActiveDate is yesterday (not yet incremented)', () => {
    expect(calculateStreak(dateString(1), 5)).toBe(5);
  });

  it('returns 0 when lastActiveDate is 2 days ago (streak broken)', () => {
    expect(calculateStreak(dateString(2), 5)).toBe(0);
  });

  it('returns 0 when lastActiveDate is a week ago', () => {
    expect(calculateStreak(dateString(7), 10)).toBe(0);
  });

  it('returns 0 when lastActiveDate is null', () => {
    expect(calculateStreak(null, 0)).toBe(0);
  });

  it('returns 0 when lastActiveDate is undefined', () => {
    expect(calculateStreak(undefined, 3)).toBe(0);
  });
});

describe('isStreakMilestone', () => {
  it('returns true for milestone values', () => {
    expect(isStreakMilestone(7)).toBe(true);
    expect(isStreakMilestone(30)).toBe(true);
    expect(isStreakMilestone(100)).toBe(true);
  });

  it('returns false for non-milestone values', () => {
    expect(isStreakMilestone(1)).toBe(false);
    expect(isStreakMilestone(5)).toBe(false);
    expect(isStreakMilestone(14)).toBe(false);
    expect(isStreakMilestone(50)).toBe(false);
  });
});
