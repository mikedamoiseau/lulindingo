import { describe, it, expect } from 'vitest';
import {
  granularityFor,
  isWithinTolerance,
  makeBuckets,
  buildEstimationExercise,
  TOLERANCE_PCT,
  ABSOLUTE_FLOOR,
  BUCKET_COUNT,
} from '../estimation';

describe('granularityFor', () => {
  it('scales the rounding step by magnitude', () => {
    expect(granularityFor(47)).toBe(10);
    expect(granularityFor(247)).toBe(100);
    expect(granularityFor(3_400)).toBe(1_000);
    expect(granularityFor(42_000)).toBe(10_000);
    expect(granularityFor(640_000)).toBe(100_000);
  });
});

describe('isWithinTolerance', () => {
  it('accepts a guess within 10% of the answer', () => {
    expect(isWithinTolerance(900, 1000)).toBe(true);   // 10% exactly
    expect(isWithinTolerance(1050, 1000)).toBe(true);
  });
  it('rejects a guess outside 10%', () => {
    expect(isWithinTolerance(1200, 1000)).toBe(false);
    expect(isWithinTolerance(800, 1000)).toBe(false);
  });
  it('uses an absolute floor for small answers', () => {
    // 10% of 30 = 3, but floor is 5 → 34 is within band
    expect(isWithinTolerance(34, 30)).toBe(true);
    expect(isWithinTolerance(36, 30)).toBe(false);
  });
  it('exposes the tuning constants', () => {
    expect(TOLERANCE_PCT).toBe(0.10);
    expect(ABSOLUTE_FLOOR).toBe(5);
  });
});

describe('makeBuckets', () => {
  it('returns BUCKET_COUNT distinct, sorted, non-negative buckets', () => {
    const { buckets } = makeBuckets(247);
    expect(buckets).toHaveLength(BUCKET_COUNT);
    expect(new Set(buckets).size).toBe(BUCKET_COUNT);
    expect([...buckets].sort((a, b) => a - b)).toEqual(buckets);
    expect(buckets.every((b) => b >= 0)).toBe(true);
  });

  it('all buckets are multiples of the granularity', () => {
    const { buckets, granularity } = makeBuckets(3_400);
    expect(granularity).toBe(1_000);
    expect(buckets.every((b) => b % granularity === 0)).toBe(true);
  });

  it('exactly one bucket is the correctBucket and it owns the answer', () => {
    const { buckets, correctBucket, granularity } = makeBuckets(247);
    expect(buckets.filter((b) => b === correctBucket)).toHaveLength(1);
    // correctBucket is the closest multiple of granularity to the answer
    expect(correctBucket).toBe(Math.round(247 / granularity) * granularity); // 200
  });

  // Property sweep — the estimation analogue of validate-exercises invariants
  it('over many magnitudes, exactly one owning bucket, straddled when possible', () => {
    let seq = 0;
    const rng = () => ((seq = (seq * 9301 + 49297) % 233280) / 233280);
    for (const answer of [123, 580, 999, 1234, 7777, 40500, 612345]) {
      const { buckets, correctBucket } = makeBuckets(answer, rng);
      expect(buckets).toContain(correctBucket);
      expect(buckets.filter((b) => b === correctBucket)).toHaveLength(1);
      expect(new Set(buckets).size).toBe(BUCKET_COUNT);
      // straddled: when correctBucket > smallest possible, expect a bucket below
      const below = buckets.filter((b) => b < correctBucket).length;
      const above = buckets.filter((b) => b > correctBucket).length;
      if (correctBucket > 0) expect(below).toBeGreaterThanOrEqual(1);
      expect(above).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildEstimationExercise', () => {
  const source = { type: 'type-answer', equation: '247 + 581 = []', correctAnswer: 828 };

  it('preserves correctAnswer and rewrites = to ≈', () => {
    const est = buildEstimationExercise(source, 'bucket');
    expect(est.estimation).toBe(true);
    expect(est.correctAnswer).toBe(828);
    expect(est.equation).toContain('≈');
    expect(est.equation).not.toContain('=');
  });

  it('bucket variant attaches buckets containing the owning bucket', () => {
    const est = buildEstimationExercise(source, 'bucket');
    expect(est.estimationMode).toBe('bucket');
    expect(est.buckets).toContain(est.correctBucket);
    expect(est.buckets).toHaveLength(BUCKET_COUNT);
  });

  it('type variant has no buckets', () => {
    const est = buildEstimationExercise(source, 'type');
    expect(est.estimationMode).toBe('type');
    expect(est.buckets).toBeUndefined();
  });
});
