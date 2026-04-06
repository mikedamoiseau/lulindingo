import { describe, it, expect } from 'vitest';
import { getSkippedLessonIds } from '../skipUnits';

const allLessons = [
  { id: 'math-addition-1-lesson-1', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-2', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-3', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-4', unitId: 'math-addition-1' },
  { id: 'math-addition-1-lesson-5', unitId: 'math-addition-1' },
  { id: 'math-addition-2-lesson-1', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-2', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-3', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-4', unitId: 'math-addition-2' },
  { id: 'math-addition-2-lesson-5', unitId: 'math-addition-2' },
  { id: 'math-subtraction-1-lesson-1', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-2', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-3', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-4', unitId: 'math-subtraction-1' },
  { id: 'math-subtraction-1-lesson-5', unitId: 'math-subtraction-1' },
];

describe('getSkippedLessonIds', () => {
  it('returns empty array for Starter (6-7)', () => {
    expect(getSkippedLessonIds('6-7', allLessons)).toEqual([]);
  });

  it('returns Addition 1 lessons for Explorer (8-10)', () => {
    const skipped = getSkippedLessonIds('8-10', allLessons);
    expect(skipped).toHaveLength(5);
    expect(skipped.every((id) => id.startsWith('math-addition-1'))).toBe(true);
  });

  it('returns Addition 1 + Addition 2 lessons for Challenger (11-12)', () => {
    const skipped = getSkippedLessonIds('11-12', allLessons);
    expect(skipped).toHaveLength(10);
    expect(skipped.filter((id) => id.startsWith('math-addition-1'))).toHaveLength(5);
    expect(skipped.filter((id) => id.startsWith('math-addition-2'))).toHaveLength(5);
  });

  it('returns empty array for unknown ageBand', () => {
    expect(getSkippedLessonIds('unknown', allLessons)).toEqual([]);
  });
});
