import { describe, it, expect } from 'vitest';
import { getSkippedLessonIds } from '../skipUnits';

const allLessons = [
  { id: 'math-addition-lesson-1', unitId: 'math-addition' },
  { id: 'math-addition-lesson-2', unitId: 'math-addition' },
  { id: 'math-addition-lesson-3', unitId: 'math-addition' },
  { id: 'math-addition-lesson-4', unitId: 'math-addition' },
  { id: 'math-addition-lesson-5', unitId: 'math-addition' },
  { id: 'math-subtraction-lesson-1', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-2', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-3', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-4', unitId: 'math-subtraction' },
  { id: 'math-subtraction-lesson-5', unitId: 'math-subtraction' },
  { id: 'math-multiplication-lesson-1', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-2', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-3', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-4', unitId: 'math-multiplication' },
  { id: 'math-multiplication-lesson-5', unitId: 'math-multiplication' },
  { id: 'math-division-lesson-1', unitId: 'math-division' },
  { id: 'math-division-lesson-2', unitId: 'math-division' },
  { id: 'math-division-lesson-3', unitId: 'math-division' },
  { id: 'math-division-lesson-4', unitId: 'math-division' },
  { id: 'math-division-lesson-5', unitId: 'math-division' },
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
