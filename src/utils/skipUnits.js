const SKIP_UNITS_BY_BAND = {
  '6-7': [],
  '8-10': ['math-addition-1'],
  '11-12': ['math-addition-1', 'math-addition-2', 'math-subtraction-1'],
};

/**
 * Returns lesson IDs that should be auto-completed for a given ageBand.
 * @param {string} ageBand - '6-7', '8-10', or '11-12'
 * @param {Array<{id: string, unitId: string}>} allLessons - all lessons from DB
 * @returns {string[]} lesson IDs to mark as completed
 */
export function getSkippedLessonIds(ageBand, allLessons) {
  const unitsToSkip = SKIP_UNITS_BY_BAND[ageBand] || [];
  return allLessons
    .filter((lesson) => unitsToSkip.includes(lesson.unitId))
    .map((lesson) => lesson.id);
}
