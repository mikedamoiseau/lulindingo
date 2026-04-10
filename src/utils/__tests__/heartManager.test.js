import { describe, it, expect } from 'vitest';
import { calculateCurrentHearts, getNextRefillMs, MAX_HEARTS, REFILL_INTERVAL_MS } from '../heartManager.js';

describe('heartManager', () => {
  it('returns MAX_HEARTS when already full', () => {
    const now = new Date();
    expect(calculateCurrentHearts(10, now).hearts).toBe(10);
  });

  it('returns MAX_HEARTS when full regardless of time elapsed', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(calculateCurrentHearts(10, twoHoursAgo).hearts).toBe(10);
  });

  it('refills 1 heart after 20 minutes', () => {
    const twentyFiveMinAgo = new Date(Date.now() - 25 * 60 * 1000);
    const result = calculateCurrentHearts(3, twentyFiveMinAgo);
    expect(result.hearts).toBe(4);
  });

  it('refills 2 hearts after 40 minutes', () => {
    const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000);
    expect(calculateCurrentHearts(3, fortyMinAgo).hearts).toBe(5);
  });

  it('does not refill before 20 minutes', () => {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    expect(calculateCurrentHearts(3, fifteenMinAgo).hearts).toBe(3);
  });

  it('caps at MAX_HEARTS even with long elapsed time', () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    // 0 hearts + 12 refills (240min / 20min) = 12, capped at 10
    expect(calculateCurrentHearts(0, fourHoursAgo).hearts).toBe(10);
  });

  it('caps at MAX_HEARTS when refills would exceed max', () => {
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);
    // 8 hearts + 3 refills (60min / 20min) = 11, capped at 10
    expect(calculateCurrentHearts(8, sixtyMinAgo).hearts).toBe(10);
  });

  it('advances heartsLastRefill by consumed intervals', () => {
    const now = Date.now();
    const twentyFiveMinAgo = new Date(now - 25 * 60 * 1000);
    const result = calculateCurrentHearts(3, twentyFiveMinAgo);
    // 1 refill consumed → timestamp should advance by exactly 1 interval
    const expectedRefill = new Date(twentyFiveMinAgo.getTime() + REFILL_INTERVAL_MS).toISOString();
    expect(result.heartsLastRefill).toBe(expectedRefill);
  });

  it('snaps heartsLastRefill to now when reaching max hearts', () => {
    const before = Date.now();
    const fourHoursAgo = new Date(before - 4 * 60 * 60 * 1000);
    const result = calculateCurrentHearts(0, fourHoursAgo);
    const after = Date.now();
    const refillTime = new Date(result.heartsLastRefill).getTime();
    expect(refillTime).toBeGreaterThanOrEqual(before);
    expect(refillTime).toBeLessThanOrEqual(after);
  });

  it('does not change heartsLastRefill when no refills are due', () => {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const result = calculateCurrentHearts(3, fifteenMinAgo);
    expect(result.heartsLastRefill).toEqual(fifteenMinAgo);
  });

  it('getNextRefillMs returns time until next refill', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const ms = getNextRefillMs(tenMinAgo);
    // Should be approximately 10 minutes remaining
    expect(ms).toBeGreaterThan(9 * 60 * 1000);
    expect(ms).toBeLessThanOrEqual(REFILL_INTERVAL_MS);
  });

  it('exports correct constants', () => {
    expect(MAX_HEARTS).toBe(10);
    expect(REFILL_INTERVAL_MS).toBe(20 * 60 * 1000);
  });
});
