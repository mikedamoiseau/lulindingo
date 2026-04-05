import { describe, it, expect } from 'vitest';
import { calculateCurrentHearts, getNextRefillMs, MAX_HEARTS, REFILL_INTERVAL_MS } from '../heartManager.js';

describe('heartManager', () => {
  it('returns MAX_HEARTS when already full', () => {
    const now = new Date();
    expect(calculateCurrentHearts(5, now)).toBe(5);
  });

  it('returns MAX_HEARTS when full regardless of time elapsed', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(calculateCurrentHearts(5, twoHoursAgo)).toBe(5);
  });

  it('refills 1 heart after 20 minutes', () => {
    const twentyFiveMinAgo = new Date(Date.now() - 25 * 60 * 1000);
    expect(calculateCurrentHearts(3, twentyFiveMinAgo)).toBe(4);
  });

  it('refills 2 hearts after 40 minutes', () => {
    const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000);
    expect(calculateCurrentHearts(3, fortyMinAgo)).toBe(5);
  });

  it('does not refill before 20 minutes', () => {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    expect(calculateCurrentHearts(3, fifteenMinAgo)).toBe(3);
  });

  it('caps at MAX_HEARTS even with long elapsed time', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(calculateCurrentHearts(0, twoHoursAgo)).toBe(5);
  });

  it('caps at MAX_HEARTS when refills would exceed max', () => {
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);
    // 4 hearts + 3 refills (60min / 20min) = 7, capped at 5
    expect(calculateCurrentHearts(4, sixtyMinAgo)).toBe(5);
  });

  it('getNextRefillMs returns time until next refill', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const ms = getNextRefillMs(tenMinAgo);
    // Should be approximately 10 minutes remaining
    expect(ms).toBeGreaterThan(9 * 60 * 1000);
    expect(ms).toBeLessThanOrEqual(REFILL_INTERVAL_MS);
  });

  it('exports correct constants', () => {
    expect(MAX_HEARTS).toBe(5);
    expect(REFILL_INTERVAL_MS).toBe(20 * 60 * 1000);
  });
});
