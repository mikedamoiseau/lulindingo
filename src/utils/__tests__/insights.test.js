import { describe, it, expect, vi } from 'vitest';
import {
  bucketHour,
  makeGateChallenge,
  computeInsights,
  buildRecommendations,
} from '../insights';

const units = [
  { id: 'math-addition', moduleId: 'math', title: 'Addition', operation: 'addition', order: 1 },
  { id: 'math-subtraction', moduleId: 'math', title: 'Subtraction', operation: 'subtraction', order: 2 },
  { id: 'math-multiplication', moduleId: 'math', title: 'Multiplication', operation: 'multiplication', order: 3 },
  { id: 'math-division', moduleId: 'math', title: 'Division', operation: 'division', order: 4 },
];
const lessons = units.flatMap((u) =>
  [1, 2, 3, 4, 5].map((tier) => ({
    id: `${u.id}-lesson-${tier}`, unitId: u.id, order: tier, tier, operation: u.operation,
  }))
);
function prog(lessonId, stars, bestAccuracy = 90, attempts = 1) {
  return { lessonId, completed: true, stars, bestAccuracy, attempts, completedAt: new Date() };
}

describe('bucketHour', () => {
  it('buckets morning/afternoon/evening', () => {
    expect(bucketHour(7)).toBe('morning');
    expect(bucketHour(11)).toBe('morning');
    expect(bucketHour(12)).toBe('afternoon');
    expect(bucketHour(17)).toBe('afternoon');
    expect(bucketHour(18)).toBe('evening');
    expect(bucketHour(23)).toBe('evening');
    expect(bucketHour(2)).toBe('evening'); // late night counts as evening
  });
});

describe('makeGateChallenge', () => {
  it('produces factors in 6..9 and a correct product', () => {
    const c = makeGateChallenge(() => 0); // rng=0 → lowest factor
    expect(c.a).toBeGreaterThanOrEqual(6);
    expect(c.b).toBeLessThanOrEqual(9);
    expect(c.answer).toBe(c.a * c.b);
  });
  it('is deterministic under a mocked rng', () => {
    const rng = vi.fn().mockReturnValue(0.99);
    const c = makeGateChallenge(rng);
    expect(c.a).toBe(9);
    expect(c.b).toBe(9);
    expect(c.answer).toBe(81);
  });
});

describe('computeInsights', () => {
  it('cold start: no progress, no history', () => {
    const m = computeInsights({
      user: { totalXp: 0, currentStreak: 0, longestStreak: 0, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory: [],
    });
    expect(m.lessonsCompletedTotal).toBe(0);
    expect(m.averageStars).toBe(0);
    expect(m.xpTrend).toEqual([]);
    expect(m.operations).toHaveLength(4);
    expect(m.operations.every((o) => o.tiersCompleted === 0)).toBe(true);
    expect(m.factVault).toBeNull();
  });

  it('computes per-operation mastery and average stars', () => {
    const progress = [
      prog('math-addition-lesson-1', 3), prog('math-addition-lesson-2', 3),
      prog('math-addition-lesson-3', 3),
      prog('math-multiplication-lesson-1', 1, 60, 4),
    ];
    const m = computeInsights({
      user: { totalXp: 250, currentStreak: 3, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory: [],
    });
    const add = m.operations.find((o) => o.operation === 'addition');
    expect(add.tiersCompleted).toBe(3);
    expect(add.avgStars).toBe(3);
    const mul = m.operations.find((o) => o.operation === 'multiplication');
    expect(mul.avgStars).toBe(1);
    expect(mul.avgAttempts).toBe(4);
    expect(m.lessonsCompletedTotal).toBe(4);
  });

  it('aggregates xp trend and time-of-day from streakHistory', () => {
    const streakHistory = [
      { date: '2026-06-20', lessonsCompleted: 2, xpEarned: 120, timeOfDay: { morning: 2, afternoon: 0, evening: 0 } },
      { date: '2026-06-21', lessonsCompleted: 1, xpEarned: 60, timeOfDay: { morning: 0, afternoon: 1, evening: 0 } },
    ];
    const m = computeInsights({
      user: { totalXp: 180, currentStreak: 2, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory,
    });
    expect(m.xpTrend.map((d) => d.xp)).toEqual([120, 60]);
    expect(m.timeOfDay).toEqual({ morning: 2, afternoon: 1, evening: 0 });
    expect(m.dominantTimeOfDay).toBe('morning');
  });

  it('tolerates streakHistory rows missing timeOfDay (pre-upgrade)', () => {
    const streakHistory = [{ date: '2026-06-20', lessonsCompleted: 1, xpEarned: 60 }];
    const m = computeInsights({
      user: { totalXp: 60, currentStreak: 1, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory,
    });
    expect(m.timeOfDay).toEqual({ morning: 0, afternoon: 0, evening: 0 });
    expect(m.dominantTimeOfDay).toBeNull();
  });
});

describe('buildRecommendations', () => {
  it('cold start → one nudge, no practice suggestion', () => {
    const m = computeInsights({
      user: { totalXp: 0, currentStreak: 0, ageBand: '8-10', startingTier: 1 },
      progress: [], units, lessons, streakHistory: [],
    });
    const rec = buildRecommendations(m);
    expect(rec.nudges).toHaveLength(1);
    expect(rec.practiceTogether).toBeNull();
  });

  it('breezing through → level-up nudge mentioning the operation', () => {
    const progress = [
      prog('math-division-lesson-1', 3), prog('math-division-lesson-2', 3),
      prog('math-division-lesson-3', 3),
    ];
    const m = computeInsights({
      user: { totalXp: 300, currentStreak: 4, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory: [],
    });
    const rec = buildRecommendations(m);
    expect(rec.nudges.join(' ').toLowerCase()).toContain('division');
    expect(rec.nudges.join(' ').toLowerCase()).toContain('tier');
  });

  it('struggling area becomes the practice-together suggestion', () => {
    const progress = [
      prog('math-multiplication-lesson-1', 1, 55, 4),
      prog('math-multiplication-lesson-2', 1, 60, 3),
    ];
    const m = computeInsights({
      user: { totalXp: 80, currentStreak: 1, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory: [],
    });
    const rec = buildRecommendations(m);
    expect(rec.practiceTogether).not.toBeNull();
    expect(rec.practiceTogether.body.toLowerCase()).toContain('multiplication');
  });

  it('caps nudges at 3', () => {
    const progress = [
      prog('math-addition-lesson-1', 3), prog('math-addition-lesson-2', 3), prog('math-addition-lesson-3', 3),
      prog('math-division-lesson-1', 3), prog('math-division-lesson-2', 3), prog('math-division-lesson-3', 3),
    ];
    const streakHistory = [
      { date: '2026-06-20', lessonsCompleted: 5, xpEarned: 300, timeOfDay: { morning: 5, afternoon: 0, evening: 0 } },
    ];
    const m = computeInsights({
      user: { totalXp: 600, currentStreak: 9, ageBand: '8-10', startingTier: 1 },
      progress, units, lessons, streakHistory,
    });
    const rec = buildRecommendations(m);
    expect(rec.nudges.length).toBeLessThanOrEqual(3);
  });

  it('does not emit fact-level nudges while factVault is null', () => {
    const m = computeInsights({
      user: { totalXp: 100, currentStreak: 1, ageBand: '8-10', startingTier: 1 },
      progress: [prog('math-addition-lesson-1', 2)], units, lessons, streakHistory: [],
    });
    expect(m.factVault).toBeNull();
    const rec = buildRecommendations(m);
    expect(rec.nudges.join(' ').toLowerCase()).not.toContain('fact');
  });
});
