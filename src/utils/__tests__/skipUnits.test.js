import { describe, it, expect } from 'vitest';
import { getSkippedLessonIds, getFirstActiveUnitId, getPlacementSkippedLessonIds } from '../skipUnits';

const allLessons = [
  { id: 'math-addition-lesson-1', unitId: 'math-addition', order: 1 },
  { id: 'math-addition-lesson-2', unitId: 'math-addition', order: 2 },
  { id: 'math-addition-lesson-3', unitId: 'math-addition', order: 3 },
  { id: 'math-addition-lesson-4', unitId: 'math-addition', order: 4 },
  { id: 'math-addition-lesson-5', unitId: 'math-addition', order: 5 },
  { id: 'math-subtraction-lesson-1', unitId: 'math-subtraction', order: 1 },
  { id: 'math-subtraction-lesson-2', unitId: 'math-subtraction', order: 2 },
  { id: 'math-subtraction-lesson-3', unitId: 'math-subtraction', order: 3 },
  { id: 'math-subtraction-lesson-4', unitId: 'math-subtraction', order: 4 },
  { id: 'math-subtraction-lesson-5', unitId: 'math-subtraction', order: 5 },
  { id: 'math-multiplication-lesson-1', unitId: 'math-multiplication', order: 1 },
  { id: 'math-multiplication-lesson-2', unitId: 'math-multiplication', order: 2 },
  { id: 'math-multiplication-lesson-3', unitId: 'math-multiplication', order: 3 },
  { id: 'math-multiplication-lesson-4', unitId: 'math-multiplication', order: 4 },
  { id: 'math-multiplication-lesson-5', unitId: 'math-multiplication', order: 5 },
  { id: 'math-division-lesson-1', unitId: 'math-division', order: 1 },
  { id: 'math-division-lesson-2', unitId: 'math-division', order: 2 },
  { id: 'math-division-lesson-3', unitId: 'math-division', order: 3 },
  { id: 'math-division-lesson-4', unitId: 'math-division', order: 4 },
  { id: 'math-division-lesson-5', unitId: 'math-division', order: 5 },
];

describe('getSkippedLessonIds', () => {
  it('Starter (6-7) skips nothing', () => {
    expect(getSkippedLessonIds('6-7', allLessons)).toEqual([]);
  });

  it('Explorer (8-10) skips nothing', () => {
    expect(getSkippedLessonIds('8-10', allLessons)).toEqual([]);
  });

  it('Challenger (11-12) skips Addition + Subtraction', () => {
    const skipped = getSkippedLessonIds('11-12', allLessons);
    expect(skipped).toHaveLength(10);
    expect(skipped.filter((id) => id.includes('addition'))).toHaveLength(5);
    expect(skipped.filter((id) => id.includes('subtraction'))).toHaveLength(5);
  });

  it('unknown ageBand skips nothing', () => {
    expect(getSkippedLessonIds('unknown', allLessons)).toEqual([]);
  });
});

describe('getFirstActiveUnitId', () => {
  const units = [
    { id: 'math-addition', order: 1 },
    { id: 'math-subtraction', order: 2 },
    { id: 'math-multiplication', order: 3 },
    { id: 'math-division', order: 4 },
  ];

  it('returns first unit when nothing skipped', () => {
    expect(getFirstActiveUnitId(units, [])).toBe('math-addition');
  });

  it('returns first non-skipped unit', () => {
    const skippedIds = allLessons
      .filter((l) => l.unitId === 'math-addition' || l.unitId === 'math-subtraction')
      .map((l) => l.id);
    expect(getFirstActiveUnitId(units, skippedIds)).toBe('math-multiplication');
  });

  it('returns undefined if all units skipped', () => {
    const allIds = allLessons.map((l) => l.id);
    expect(getFirstActiveUnitId(units, allIds)).toBeUndefined();
  });
});

describe('getPlacementSkippedLessonIds', () => {
  it('returns empty when startingTier is 1', () => {
    expect(getPlacementSkippedLessonIds(1, 'math-addition', allLessons)).toEqual([]);
  });

  it('skips lessons below startingTier', () => {
    const skipped = getPlacementSkippedLessonIds(3, 'math-addition', allLessons);
    expect(skipped).toHaveLength(2);
    expect(skipped).toContain('math-addition-lesson-1');
    expect(skipped).toContain('math-addition-lesson-2');
  });

  it('skips 4 lessons when startingTier is 5', () => {
    const skipped = getPlacementSkippedLessonIds(5, 'math-multiplication', allLessons);
    expect(skipped).toHaveLength(4);
  });

  it('returns empty for unknown unitId', () => {
    expect(getPlacementSkippedLessonIds(3, 'math-unknown', allLessons)).toEqual([]);
  });
});
